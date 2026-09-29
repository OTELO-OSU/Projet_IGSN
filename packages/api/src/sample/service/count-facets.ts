import type {
  ListSamplesQuery,
  SampleFacetCounts,
} from "@projet-igsn/domain/sample/sample-validator";

import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { type RawBuilder, sql, type SqlBool } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import {
  FACET_COLUMN,
  FACET_JOIN,
  facetFilter,
  personFacetValues,
} from "./facet-filter.ts";
import { publishedScope, sampleFilters } from "./list-sample.ts";
import { applyFuzzyThreshold } from "./search-filter.ts";

type Facet = (typeof SAMPLE_FACETS)[number];

const COUNTED_KINDS: readonly Facet["kind"][] = ["enum", "hierarchy", "linked"];

const COUNTED_FACETS = SAMPLE_FACETS.filter((facet) =>
  COUNTED_KINDS.includes(facet.kind),
);

const COLUMN_FACETS = COUNTED_FACETS.filter((facet) => !FACET_JOIN[facet.key]);

const flag = (key: string) => `is_${key}`;

function valueCounts(
  facet: Facet,
  where: RawBuilder<unknown>,
): RawBuilder<unknown> {
  const join = FACET_JOIN[facet.key];
  if (join) {
    const column = sql.ref(`${join.table}.${join.column}`);
    const from = sql`matching join ${sql.table(join.table)} on ${sql.ref(`${join.table}.sample_id`)} = matching.id`;
    return facet.kind === "hierarchy"
      ? sql`select subpath(${column}, 0, depth)::text as value, count(distinct matching.id) as count
          from ${from} cross join lateral generate_series(1, nlevel(${column})) as depth
         where ${where} group by 1`
      : sql`select ${column}::text as value, count(*) as count from ${from} where ${where} group by 1`;
  }
  const column = sql.ref(`matching.${FACET_COLUMN[facet.key]!}`);
  if (facet.kind === "hierarchy") {
    return sql`select subpath(leaf, 0, depth)::text as value, sum(n) as count
      from (select ${column} as leaf, count(*) as n from matching where ${where} group by 1) as leaves
      cross join lateral generate_series(1, nlevel(leaf)) as depth
     group by 1`;
  }
  return facet.kind === "enum" && facet.multiValued
    ? sql`select value::text, count(*) as count from matching cross join lateral unnest(${column}) as value where ${where} group by 1`
    : sql`select ${column}::text as value, count(*) as count from matching where ${where} group by 1`;
}

function facetCounts(facet: Facet, activeKeys: string[]): RawBuilder<unknown> {
  const others = activeKeys
    .filter((key) => key !== facet.key)
    .map((key) => sql.ref(`matching.${flag(key)}`));
  const where = others.length > 0 ? sql.join(others, sql` and `) : sql`true`;
  return sql`(select ${facet.key}::text as facet, value, count
    from (${valueCounts(facet, where)}) as counts
   where value is not null)`;
}

export function countPublishedFacets(
  db: Transactional<DB>,
  params: ListSamplesQuery,
): Promise<SampleFacetCounts> {
  const values: Record<string, unknown> = params;
  const active = COUNTED_FACETS.flatMap((facet) => {
    const value = values[facet.key];
    return typeof value === "string"
      ? [{ key: facet.key, filter: facetFilter(facet, value)! }]
      : [];
  });
  const base = [
    ...sampleFilters({
      ...params,
      ...Object.fromEntries(
        COUNTED_FACETS.map((facet) => [facet.key, undefined]),
      ),
    }),
    ...publishedScope(params),
  ];
  const columns = COLUMN_FACETS.map((facet) =>
    sql.ref(`sample.${FACET_COLUMN[facet.key]!}`),
  );
  const flags = active.map(
    ({ key, filter }) => sql<SqlBool>`${filter} as ${sql.id(flag(key))}`,
  );
  const activeKeys = active.map(({ key }) => key);

  return withTransaction(db, async (trx) => {
    await applyFuzzyThreshold(trx, [
      params.search,
      ...personFacetValues(params),
    ]);
    const { rows } = await sql<{ facet: string; value: string; count: string }>`
      with matching as (
        select ${sql.join([sql.ref("sample.id"), ...columns, ...flags])}
          from sample
         where ${sql.join(base, sql` and `)}
      )
      ${sql.join(
        COUNTED_FACETS.map((facet) => facetCounts(facet, activeKeys)),
        sql` union all `,
      )}
    `.execute(trx);
    return Object.fromEntries(
      COUNTED_FACETS.map((facet) => [
        facet.key,
        Object.fromEntries(
          rows
            .filter((row) => row.facet === facet.key)
            .map((row) => [row.value, Number(row.count)]),
        ),
      ]),
    );
  });
}
