import type {
  ListSamplesParams,
  ListSamplesResult,
} from "@projet-igsn/domain/sample/repository";

import { GEOLOGICAL_AGES } from "@projet-igsn/domain/sample/age/geological-age";
import { geologicalAgeBoundsMa } from "@projet-igsn/domain/sample/age/geological-age-bounds";
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

// SQL that maps a stratigraphic rank expression to one edge of its annum
// interval, as a CASE over the domain boundary table (the single source of the
// ICS numbers). edge 0 = young bound, 1 = old bound. Rank keys are the
// allow-listed 1..49 and the boundary values are fixed domain constants, all
// bound as parameters.
function geologicalAnnum(rankExpr: Expression<number>, edge: 0 | 1) {
  const whens = GEOLOGICAL_AGES.map(
    (rank) =>
      sql`WHEN ${rank} THEN ${numericAgeToAnnum(geologicalAgeBoundsMa(rank)[edge], "ma")}`,
  );
  // Cast so the bound numeric literals are double precision (else Postgres
  // infers them as text and COALESCE with the numeric columns fails).
  return sql`(CASE ${rankExpr} ${sql.join(whens, sql` `)} END)::double precision`;
}

// The age range overlap (query bounds in `ageUnit`, defaulting to Ma). Both
// sides compare in canonical annum: the query bounds via numericAgeToAnnum, the
// sample's effective interval numeric-if-present-else-geological. GREATEST/LEAST
// over the numeric_age_*_a columns are null only when BOTH are null, so COALESCE
// falls to the geological interval exactly when the sample has no numeric age
// (numeric precedence). The geological young/old edges come from LEAST/GREATEST
// over the two rank columns, so a reversed or single-bound rank range still
// derives young/old by rank order; both rank columns null makes the CASE null,
// so a row with no age at all never matches. Inclusive overlap: a bound exactly
// on a stage edge matches both neighbours.
function ageFilters(params: ListSamplesParams): Expression<SqlBool>[] {
  const unit = params.ageUnit ?? "ma";
  const geoYoung = geologicalAnnum(
    sql`LEAST(geological_age_min, geological_age_max)`,
    0,
  );
  const geoOld = geologicalAnnum(
    sql`GREATEST(geological_age_min, geological_age_max)`,
    1,
  );
  const overlapOld = sql`COALESCE(GREATEST(numeric_age_min_a, numeric_age_max_a), ${geoOld})`;
  const overlapYoung = sql`COALESCE(LEAST(numeric_age_min_a, numeric_age_max_a), ${geoYoung})`;
  return [
    ...(params.ageMin != null
      ? [
          sql<SqlBool>`${overlapOld} >= ${numericAgeToAnnum(params.ageMin, unit)}`,
        ]
      : []),
    ...(params.ageMax != null
      ? [
          sql<SqlBool>`${overlapYoung} <= ${numericAgeToAnnum(params.ageMax, unit)}`,
        ]
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
    // lives in ageFilters (annum columns), not the generic column map.
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
