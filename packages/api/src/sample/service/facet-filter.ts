import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import { numericAgeToAnnum } from "@projet-igsn/domain/sample/age/numeric-age-to-annum";
import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { type Expression, sql, type SqlBool } from "kysely";

import { likePattern } from "../../like-pattern.ts";
import { matchesToken, tokenFilters } from "./search-filter.ts";

export const FACET_COLUMN: Record<string, string> = {
  type: "type",
  material: "material",
  collectionMethod: "collection_method",
  nature: "nature",
  texture: "texture",
  researchProgramName: "sc_research_program_name",
  hostInstitution: "sc_host_institution",
  institutionalOrganization: "institutional_organization",
  institutionalOsu: "institutional_osu",
  institutionalLaboratory: "institutional_laboratory",
};

export const PERSON_FACET_COLUMNS: Record<
  string,
  { names: [string, string]; userId: string }
> = {
  chiefScientist: {
    names: ["sc_chief_scientist_firstname", "sc_chief_scientist_lastname"],
    userId: "sc_chief_scientist_user_id",
  },
  collectorName: {
    names: ["sc_collector_firstname", "sc_collector_lastname"],
    userId: "sc_collector_user_id",
  },
};

const matchesLinkedAccount = (userIdColumn: string) => (token: string) =>
  sql<SqlBool>`${sql.ref(`sample.${userIdColumn}`)} = any(array(
    select u.id from "user" u
     where ${matchesToken(["u.firstname", "u.name"], token)}
  ))`;

export const FACET_JOIN: Record<string, { table: string; column: string }> = {
  manualGroup: { table: "sample_manual_group", column: "group_id" },
  contributor: { table: "user_sample", column: "user_id" },
  mineralClassification: {
    table: "mineral_classification",
    column: "strunz_id",
  },
};

function facetFilter(
  facet: (typeof SAMPLE_FACETS)[number],
  value: string,
): Expression<SqlBool> | undefined {
  const join = FACET_JOIN[facet.key];
  if (join) {
    const column = sql.ref(`${join.table}.${join.column}`);
    return sql<SqlBool>`exists (
      select 1 from ${sql.table(join.table)}
       where ${sql.ref(`${join.table}.sample_id`)} = sample.id
         and ${facet.kind === "hierarchy" ? sql`${column} <@ ${value}::ltree` : sql`${column} = ${value}`}
    )`;
  }
  const person = PERSON_FACET_COLUMNS[facet.key];
  if (person) {
    const filters = tokenFilters(
      person.names,
      value,
      matchesLinkedAccount(person.userId),
    );
    return sql<SqlBool>`(${sql.join(filters, sql` AND `)})`;
  }
  const column = FACET_COLUMN[facet.key]!;
  switch (facet.kind) {
    case "hierarchy":
      return sql<SqlBool>`${sql.ref(column)} <@ ${value}::ltree`;
    case "enum":
      return facet.multiValued
        ? sql<SqlBool>`${value} = any(${sql.ref(column)})`
        : sql<SqlBool>`${sql.ref(column)} = ${value}`;
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

export function personFacetValues(params: ListSamplesQuery): string[] {
  const values: Record<string, unknown> = params;
  return Object.keys(PERSON_FACET_COLUMNS)
    .map((key) => values[key])
    .filter((value) => typeof value === "string");
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
