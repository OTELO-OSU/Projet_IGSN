import type {
  ListSamplesParams,
  ListSamplesResult,
} from "@projet-igsn/domain/sample/repository";

import { numericAgeToAnnum } from "@projet-igsn/domain/sample/age/numeric-age-to-annum";
import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { type Expression, sql, type SqlBool } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { withSampleChildren } from "./with-sample-children.ts";

// Each facet key maps to the sample column(s) it filters. The mapping is an
// allow-list (facet keys are fixed, never user input), so column names are safe
// to embed as identifiers; values are always bound parameters. Every facet but
// the numeric range needs an entry; facet-column.spec guards the drift, since
// SAMPLE_FACETS is typed with a widened `key: string` and cannot guard it here.
export const FACET_COLUMN: Record<string, string> = {
  type: "type",
  material: "material",
  collectionMethod: "collection_method",
  nature: "nature",
  texture: "texture",
  researchProgramName: "sc_research_program_name",
  researchProgramChief: "sc_research_program_chief",
  researchCampaign: "sc_research_campaign",
  collectorName: "sc_collector_name",
  collectionCurator: "sc_collection_curator",
};

// LIKE-escape a search term for a bound ILIKE pattern (never concatenated).
function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// Case- and diacritic-insensitive substring match on one column. unaccent needs
// the migration-enabled Postgres extension.
function ilikeUnaccent(column: string, value: string): Expression<SqlBool> {
  return sql<SqlBool>`unaccent(${sql.ref(column)}) ILIKE unaccent(${likePattern(value)})`;
}

// The global search: name, specific_name and igsn at once.
// ponytail: seq scan (leading-wildcard ILIKE over unaccent() can't use a btree).
// Fine at registry scale; if the table grows, add pg_trgm GIN expression indexes
// on an IMMUTABLE unaccent() wrapper of each column.
function matchesSearch(search: string): Expression<SqlBool> {
  const pattern = likePattern(search);
  return sql<SqlBool>`(
    unaccent(name) ILIKE unaccent(${pattern})
    OR unaccent(specific_name) ILIKE unaccent(${pattern})
    OR unaccent(igsn) ILIKE unaccent(${pattern})
  )`;
}

// Rows whose generated geom intersects the drawn box, bound as parameters.
// ponytail: ST_MakeEnvelope does not wrap the antimeridian; a box crossing
// longitude 180 (west > east) is out of v1 scope and rejected by the domain
// schema, so it never reaches here. Split it client-side if it ever matters.
function withinBbox(
  bbox: NonNullable<ListSamplesParams["bbox"]>,
): Expression<SqlBool> {
  return sql<SqlBool>`ST_Intersects(
    geom,
    ST_MakeEnvelope(${bbox.west}, ${bbox.south}, ${bbox.east}, ${bbox.north}, 4326)::geography
  )`;
}

// The age range overlap, against the sample's generated annum interval
// (age_min_a = youngest edge, age_max_a = oldest). Query bounds are in
// `ageUnit`, defaulting to Ma, converted to the same canonical annum. The bounds
// cross because it is an overlap, not a containment: "at least X old" bites on
// the sample's oldest edge, "at most Y old" on its youngest. Inclusive, so a
// bound exactly on a stage edge matches both neighbours.
function ageFilters(params: ListSamplesParams): Expression<SqlBool>[] {
  const unit = params.ageUnit ?? "ma";
  return [
    ...(params.ageMin != null
      ? [sql<SqlBool>`age_max_a >= ${numericAgeToAnnum(params.ageMin, unit)}`]
      : []),
    ...(params.ageMax != null
      ? [sql<SqlBool>`age_min_a <= ${numericAgeToAnnum(params.ageMax, unit)}`]
      : []),
  ];
}

// Build the WHERE predicates for the global search plus every set filter, driven
// by the facet registry so a new facet needs only a registry entry and a column
// here. Hierarchies match at-or-under the picked node (ltree `<@`), enums by
// equality, text by unaccent ILIKE. The numeric age range is not a generic
// facet: it compares against dedicated comparable columns, so it is appended by
// its own builder.
function facetFilter(
  facet: (typeof SAMPLE_FACETS)[number],
  value: string,
): Expression<SqlBool> | undefined {
  // A facet added to the registry without a column here filters nothing rather
  // than breaking every /samples request; the spec catches it before that ships.
  const column = FACET_COLUMN[facet.key];
  if (!column) return undefined;
  switch (facet.kind) {
    // Value is validated against the vocabulary, so the ltree cast is safe.
    case "hierarchy":
      return sql<SqlBool>`${sql.ref(column)} <@ ${value}::ltree`;
    case "enum":
      return sql<SqlBool>`${sql.ref(column)} = ${value}`;
    case "text":
      return ilikeUnaccent(column, value);
    // The age range is a numericRange facet for the sidebar UI, but its filter
    // lives in ageFilters, not the generic column map.
    case "numericRange":
      return undefined;
  }
}

function buildSampleFilters(params: ListSamplesParams): Expression<SqlBool>[] {
  // Facet params are validated by the query schema; read them by the registry's
  // (string) keys, which the typed ListSamplesParams cannot be indexed by.
  const facetValues: Record<string, unknown> = params;

  return [
    ...(params.search !== undefined ? [matchesSearch(params.search)] : []),
    ...(params.bbox !== undefined ? [withinBbox(params.bbox)] : []),
    ...SAMPLE_FACETS.flatMap((facet) => {
      const value = facetValues[facet.key];
      if (typeof value !== "string") return [];
      const filter = facetFilter(facet, value);
      return filter ? [filter] : [];
    }),
    ...ageFilters(params),
  ];
}

export async function listSamples(
  db: Transactional<DB>,
  params: ListSamplesParams,
  publishedOnly = false,
): Promise<ListSamplesResult> {
  const { page, perPage, sort, order = "asc" } = params;
  const filters = buildSampleFilters(params);

  const rows = await db
    .selectFrom("sample")
    .selectAll()
    .$if(publishedOnly, (qb) => qb.where("published", "=", true))
    .$if(filters.length > 0, (qb) => qb.where((eb) => eb.and(filters)))
    // Status is IGSN presence; last-modified stays as the tiebreak.
    .$if(sort === "status", (qb) => qb.orderBy(sql`igsn is not null`, order))
    .orderBy("updated_at", "desc")
    .orderBy("id", "desc")
    .limit(perPage)
    .offset((page - 1) * perPage)
    .execute();

  const { count } = await db
    .selectFrom("sample")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .$if(publishedOnly, (qb) => qb.where("published", "=", true))
    .$if(filters.length > 0, (qb) => qb.where((eb) => eb.and(filters)))
    .executeTakeFirstOrThrow();

  return {
    data: await withSampleChildren(db, rows),
    total: Number(count),
  };
}
