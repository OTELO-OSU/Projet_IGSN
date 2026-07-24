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
// to embed as identifiers; values are always bound parameters.
const FACET_COLUMN: Record<string, string> = {
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

// The numeric age range overlap (query bounds in `ageUnit`, defaulting to Ma).
// Both sides compare in canonical annum: the query bounds via numericAgeToAnnum,
// the stored bounds via the generated numeric_age_*_a columns. GREATEST/LEAST
// pick the sample's oldest/youngest and ignore a null bound (a single-bound
// draft); a row with no age (both columns null) never matches.
function numericAgeFilters(params: ListSamplesParams): Expression<SqlBool>[] {
  const unit = params.ageUnit ?? "ma";
  const filters: Expression<SqlBool>[] = [];
  if (params.ageMin != null) {
    const minA = numericAgeToAnnum(params.ageMin, unit);
    filters.push(
      sql<SqlBool>`GREATEST(numeric_age_min_a, numeric_age_max_a) >= ${minA}`,
    );
  }
  if (params.ageMax != null) {
    const maxA = numericAgeToAnnum(params.ageMax, unit);
    filters.push(
      sql<SqlBool>`LEAST(numeric_age_min_a, numeric_age_max_a) <= ${maxA}`,
    );
  }
  return filters;
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
  const column = FACET_COLUMN[facet.key]!;
  switch (facet.kind) {
    // Value is validated against the vocabulary, so the ltree cast is safe.
    case "hierarchy":
      return sql<SqlBool>`${sql.ref(column)} <@ ${value}::ltree`;
    case "enum":
      return sql<SqlBool>`${sql.ref(column)} = ${value}`;
    case "text":
      return ilikeUnaccent(column, value);
    // The age range is a numericRange facet for the sidebar UI, but its filter
    // lives in numericAgeFilters (annum columns), not the generic column map.
    case "numericRange":
      return undefined;
  }
}

function buildSampleFilters(params: ListSamplesParams): Expression<SqlBool>[] {
  // Facet params are validated by the query schema; read them by the registry's
  // (string) keys, which the typed ListSamplesParams cannot be indexed by.
  const facetValues = params as Record<string, string | number | undefined>;

  return [
    ...(params.search !== undefined ? [matchesSearch(params.search)] : []),
    ...SAMPLE_FACETS.flatMap((facet) => {
      const value = facetValues[facet.key];
      if (typeof value !== "string") return [];
      const filter = facetFilter(facet, value);
      return filter ? [filter] : [];
    }),
    ...numericAgeFilters(params),
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
