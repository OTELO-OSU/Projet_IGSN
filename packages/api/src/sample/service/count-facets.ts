import type {
  ListSamplesQuery,
  SampleFacetCounts,
} from "@projet-igsn/domain/sample/sample-validator";

import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { searchTokens } from "@projet-igsn/domain/sample/search/search-tokens";
import { type Expression, sql, type SqlBool, type Transaction } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional, withTransaction } from "../../transaction.ts";
import {
  INDEXED_FIELD,
  indexedFacetFilter,
  type LinkedAccounts,
  matchesAccountName,
  personFacetValues,
} from "./facet-filter.ts";
import { publishedScope, sampleFilters } from "./list-sample.ts";
import { applyFuzzyThreshold, forceCustomPlan } from "./search-filter.ts";

type Facet = (typeof SAMPLE_FACETS)[number];

type TermsAggregate = {
  buckets: { key: string | null; doc_count: number }[];
} | null;

const COUNTED_KINDS: readonly Facet["kind"][] = ["enum", "hierarchy", "linked"];

const COUNTED_FACETS = SAMPLE_FACETS.filter((facet) =>
  COUNTED_KINDS.includes(facet.kind),
);

// ponytail: a facet past 65000 distinct values drops its rarest ones, page the terms aggregation if a linked facet ever grows that large
const MAX_BUCKETS = 65000;

function termsCount(facet: Facet, others: Expression<SqlBool>[]) {
  const terms = sql.lit(
    JSON.stringify({
      terms: { field: INDEXED_FIELD[facet.key], size: MAX_BUCKETS },
    }),
  );
  const filter =
    others.length > 0
      ? sql` filter (where ${sql.join(others, sql` and `)})`
      : sql``;
  return sql`pdb.agg(${terms})${filter} as ${sql.id(facet.key)}`;
}

async function resolveLinkedAccounts(
  trx: Transaction<DB>,
  params: ListSamplesQuery,
): Promise<LinkedAccounts> {
  const tokens = [...new Set(personFacetValues(params).flatMap(searchTokens))];
  if (tokens.length === 0) return new Map();
  const { rows } = await sql<Record<string, string[]>>`select ${sql.join(
    tokens.map(
      (token, index) =>
        sql`array(select u.id from "user" u where ${matchesAccountName(token)}) as ${sql.id(String(index))}`,
    ),
  )}`.execute(trx);
  return new Map(tokens.map((token, index) => [token, rows[0]![index]!]));
}

export function countPublishedFacets(
  db: Transactional<DB>,
  params: ListSamplesQuery,
): Promise<SampleFacetCounts> {
  const values: Record<string, unknown> = params;
  const active = COUNTED_FACETS.flatMap((facet) => {
    const value = values[facet.key];
    return typeof value === "string"
      ? [{ key: facet.key, pick: indexedFacetFilter(facet, value) }]
      : [];
  });
  const counts = COUNTED_FACETS.map((facet) =>
    termsCount(
      facet,
      active.filter(({ key }) => key !== facet.key).map(({ pick }) => pick),
    ),
  );

  return withTransaction(db, async (trx) => {
    await forceCustomPlan(trx);
    await applyFuzzyThreshold(trx, personFacetValues(params));
    const base = [
      sql<SqlBool>`sample.id @@@ pdb.all()`,
      ...sampleFilters(
        {
          ...params,
          ...Object.fromEntries(
            COUNTED_FACETS.map((facet) => [facet.key, undefined]),
          ),
        },
        await resolveLinkedAccounts(trx, params),
      ),
      ...publishedScope(params),
    ];
    const { rows } = await sql<Record<string, TermsAggregate>>`
      select ${sql.join(counts)} from sample where ${sql.join(base, sql` and `)}
    `.execute(trx);
    return Object.fromEntries(
      COUNTED_FACETS.map((facet) => [
        facet.key,
        Object.fromEntries(
          (rows[0]?.[facet.key]?.buckets ?? []).flatMap(({ key, doc_count }) =>
            key === null ? [] : [[key, doc_count]],
          ),
        ),
      ]),
    );
  });
}
