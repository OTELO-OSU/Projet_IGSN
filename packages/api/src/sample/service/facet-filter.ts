import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import { numericAgeToAnnum } from "@projet-igsn/domain/sample/age/numeric-age-to-annum";
import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { type Expression, sql, type SqlBool } from "kysely";

import { likePattern } from "../../like-pattern.ts";
import { unaccented } from "../../unaccented.ts";
import { matchesToken, tokenFilters } from "./search-filter.ts";

export const FACET_COLUMN: Record<string, string> = {
  type: "type",
  material: "material",
  collectionMethod: "collection_method",
  nature: "nature",
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

export const matchesAccountName = (token: string) =>
  matchesToken([unaccented("u.firstname"), unaccented("u.name")], token);

export type LinkedAccounts = ReadonlyMap<string, readonly string[]>;

const matchesLinkedAccount =
  (userIdColumn: string, linkedAccounts?: LinkedAccounts) =>
  (token: string) => {
    const column = sql.ref(`sample.${userIdColumn}`);
    return linkedAccounts
      ? sql<SqlBool>`${column} = any(${linkedAccounts.get(token) ?? []}::uuid[])`
      : sql<SqlBool>`${column} = any(array(
    select u.id from "user" u
     where ${matchesAccountName(token)}
  ))`;
  };

export const FACET_JOIN: Record<string, { table: string; column: string }> = {
  manualGroup: { table: "sample_manual_group", column: "group_id" },
  contributor: { table: "user_sample", column: "user_id" },
  mineralClassification: {
    table: "mineral_classification",
    column: "strunz_id",
  },
};

type Facet = (typeof SAMPLE_FACETS)[number];

export const INDEXED_FIELD: Record<string, string> = {
  type: "type_paths",
  material: "material_paths",
  mineralClassification: "mineral_classification_paths",
  collectionMethod: "collection_method_paths",
  nature: "nature",
  hostInstitution: "sc_host_institution",
  institutionalOrganization: "institutional_organization",
  institutionalOsu: "institutional_osu",
  institutionalLaboratory: "institutional_laboratory",
  manualGroup: "manual_group_ids",
  contributor: "contributor_ids",
};

export function indexedFacetFilter(
  facet: Facet,
  value: string,
): Expression<SqlBool> {
  const field = sql.ref(`sample.${INDEXED_FIELD[facet.key]!}`);
  return facet.kind === "enum" && !facet.multiValued
    ? sql<SqlBool>`${field} = ${value}`
    : sql<SqlBool>`${value} = any(${field})`;
}

function facetFilter(
  facet: Facet,
  value: string,
  linkedAccounts?: LinkedAccounts,
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
      person.names.map((column) => unaccented(column)),
      value,
      matchesLinkedAccount(person.userId, linkedAccounts),
      linkedAccounts !== undefined,
    );
    return sql<SqlBool>`(${sql.join(filters, sql` AND `)})`;
  }
  const column = FACET_COLUMN[facet.key]!;
  switch (facet.kind) {
    case "hierarchy":
      return sql<SqlBool>`${sql.ref(column)} <@ ${value}::ltree`;
    case "enum":
      return facet.multiValued
        ? sql<SqlBool>`${sql.ref(column)} @> array[${value}]::text[]`
        : sql<SqlBool>`${sql.ref(column)} = ${value}`;
    case "text":
      return sql<SqlBool>`immutable_unaccent(${sql.ref(column)}) ILIKE immutable_unaccent(${likePattern(value)})`;
    case "numericRange":
      return undefined;
  }
}

function numericAgeFilters(
  params: Partial<ListSamplesQuery>,
): Expression<SqlBool>[] {
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

export function personFacetValues(params: Partial<ListSamplesQuery>): string[] {
  const values: Record<string, unknown> = params;
  return Object.keys(PERSON_FACET_COLUMNS)
    .map((key) => values[key])
    .filter((value) => typeof value === "string");
}

export function facetFilters(
  params: Partial<ListSamplesQuery>,
  linkedAccounts?: LinkedAccounts,
): Expression<SqlBool>[] {
  const values: Record<string, unknown> = params;

  return [
    ...SAMPLE_FACETS.flatMap((facet) => {
      const value = values[facet.key];
      if (typeof value !== "string") return [];
      const filter =
        params.search !== undefined && INDEXED_FIELD[facet.key]
          ? indexedFacetFilter(facet, value)
          : facetFilter(facet, value, linkedAccounts);
      return filter ? [filter] : [];
    }),
    ...numericAgeFilters(params),
  ];
}
