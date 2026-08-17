import {
  parseSearchToken,
  searchTokens,
} from "@projet-igsn/domain/sample/search/search-tokens";
import { type Expression, sql, type SqlBool, type Transaction } from "kysely";

import type { DB } from "../../db.ts";

import { fuzzyThreshold } from "./fuzzy-threshold.ts";

const SEARCHED_COLUMNS = ["name", "specific_name"] as const;

const FUZZY_MIN_LENGTH = 5;

const ESCAPED_GROUP = "\\\\\\1";

function searchable(column: string) {
  return sql`immutable_unaccent(coalesce(${sql.ref(column)}, ''))`;
}

function literalSegment(value: string) {
  return sql`regexp_replace(immutable_unaccent(${value}), '([^[:alnum:]])', ${ESCAPED_GROUP}, 'g')`;
}

function tokenPattern(token: string) {
  const { segments, anchorStart, anchorEnd } = parseSearchToken(token);
  const pieces = [
    ...(anchorStart ? [sql`'\\m'`] : []),
    ...segments.flatMap((segment, index) =>
      index === 0
        ? [literalSegment(segment)]
        : [sql`'\\S*'`, literalSegment(segment)],
    ),
    ...(anchorEnd ? [sql`'\\M'`] : []),
  ];
  return sql`(SELECT ${sql.join(pieces, sql` || `)})`;
}

function isFuzzyToken(token: string): boolean {
  return token.length >= FUZZY_MIN_LENGTH && !token.includes("*");
}

function matchesIgsnExactly(token: string): Expression<SqlBool> {
  return sql<SqlBool>`igsn = upper(${token})`;
}

function matchesToken(token: string): Expression<SqlBool> {
  const pattern = tokenPattern(token);
  const arms = [
    matchesIgsnExactly(token),
    ...SEARCHED_COLUMNS.map(
      (column) => sql`${searchable(column)} ~* ${pattern}`,
    ),
    ...(isFuzzyToken(token)
      ? SEARCHED_COLUMNS.map(
          (column) =>
            sql`${searchable(column)} %> immutable_unaccent(${token})`,
        )
      : []),
  ];
  return sql<SqlBool>`(${sql.join(arms, sql` OR `)})`;
}

export function searchFilters(search: string): Expression<SqlBool>[] {
  const tokens = searchTokens(search);
  return tokens.length === 0 ? [sql<SqlBool>`false`] : tokens.map(matchesToken);
}

export async function applyFuzzyThreshold(
  trx: Transaction<DB>,
  search: string | undefined,
): Promise<void> {
  if (search === undefined || !searchTokens(search).some(isFuzzyToken)) return;
  const threshold = String(fuzzyThreshold);
  await sql`select set_config('pg_trgm.word_similarity_threshold', ${threshold}, true)`.execute(
    trx,
  );
}

export function relevanceScore(search: string): Expression<number> | undefined {
  const needle = searchTokens(search)
    .filter((token) => !token.includes("*"))
    .join(" ");
  if (!needle) return undefined;
  return sql<number>`GREATEST(${sql.join(
    SEARCHED_COLUMNS.map(
      (column) =>
        sql`word_similarity(immutable_unaccent(${needle}), ${searchable(column)})`,
    ),
  )})`;
}
