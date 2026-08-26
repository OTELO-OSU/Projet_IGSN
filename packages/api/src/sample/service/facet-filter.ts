import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import { numericAgeToAnnum } from "@projet-igsn/domain/sample/age/numeric-age-to-annum";
import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { type Expression, sql, type SqlBool } from "kysely";

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
  institutionalOrganization: "institutional_organization",
  institutionalOsu: "institutional_osu",
  institutionalLaboratory: "institutional_laboratory",
};

export const FACET_JOIN: Record<string, { table: string; column: string }> = {
  manualGroup: { table: "sample_manual_group", column: "group_id" },
  contributor: { table: "user_sample", column: "user_id" },
};

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function facetFilter(
  facet: (typeof SAMPLE_FACETS)[number],
  value: string,
): Expression<SqlBool> | undefined {
  if (facet.kind === "linked") {
    const { table, column } = FACET_JOIN[facet.key]!;
    return sql<SqlBool>`exists (
      select 1 from ${sql.table(table)}
       where ${sql.ref(`${table}.sample_id`)} = sample.id
         and ${sql.ref(`${table}.${column}`)} = ${value}
    )`;
  }
  const column = FACET_COLUMN[facet.key]!;
  switch (facet.kind) {
    case "hierarchy":
      return sql<SqlBool>`${sql.ref(column)} <@ ${value}::ltree`;
    case "enum":
      return sql<SqlBool>`${sql.ref(column)} = ${value}`;
    case "text":
      return sql<SqlBool>`immutable_unaccent(${sql.ref(column)}) ILIKE immutable_unaccent(${likePattern(value)})`;
    case "numericRange":
      return undefined;
  }
}

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
