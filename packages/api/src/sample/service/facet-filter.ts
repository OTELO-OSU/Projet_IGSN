import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import { numericAgeToAnnum } from "@projet-igsn/domain/sample/age/numeric-age-to-annum";
import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { type Expression, sql, type SqlBool } from "kysely";

// The mapping is an allow-list (facet keys are fixed, never user input), so
// column names are safe to embed as identifiers; values are always bound
// parameters.
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

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

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
      return sql<SqlBool>`immutable_unaccent(${sql.ref(column)}) ILIKE immutable_unaccent(${likePattern(value)})`;
    // A numericRange facet drives the sidebar UI, but its filter compares
    // dedicated annum columns, so it lives in numericAgeFilters below.
    case "numericRange":
      return undefined;
  }
}

// The bounds cross because this is an overlap, not a containment: "at least X
// old" bites on the sample's oldest edge, "at most Y old" on its youngest.
function numericAgeFilters(params: ListSamplesQuery): Expression<SqlBool>[] {
  const unit = params.ageUnit ?? "ma";
  return [
    ...(params.ageMin != null
      ? [sql<SqlBool>`annum_max >= ${numericAgeToAnnum(params.ageMin, unit)}`]
      : []),
    ...(params.ageMax != null
      ? [sql<SqlBool>`annum_min <= ${numericAgeToAnnum(params.ageMax, unit)}`]
      : []),
  ];
}

export function facetFilters(params: ListSamplesQuery): Expression<SqlBool>[] {
  // Facet params are validated by the query schema; read them by the registry's
  // (string) keys, which the typed ListSamplesQuery cannot be indexed by.
  const values: Record<string, unknown> = params;

  return [
    ...SAMPLE_FACETS.flatMap((facet) => {
      const value = values[facet.key];
      if (typeof value !== "string") return [];
      const filter = facetFilter(facet, value);
      return filter ? [filter] : [];
    }),
    ...numericAgeFilters(params),
  ];
}
