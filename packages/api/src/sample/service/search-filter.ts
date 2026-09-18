import {
  parseSearchToken,
  searchTokens,
} from "@projet-igsn/domain/sample/search/search-tokens";
import { type Expression, sql, type SqlBool, type Transaction } from "kysely";

import type { DB } from "../../db.ts";

import { unaccented } from "../../unaccented.ts";
import { fuzzyThreshold } from "./fuzzy-threshold.ts";

const SEARCHED_COLUMNS = ["name", "specific_name"] as const;

const FUZZY_MIN_LENGTH = 5;

const ESCAPED_GROUP = "\\\\\\1";

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

export function matchesToken(
  columns: readonly string[],
  token: string,
  extraArms: Expression<SqlBool>[] = [],
): Expression<SqlBool> {
  const pattern = tokenPattern(token);
  const arms = [
    ...extraArms,
    ...columns.map((column) => sql`${unaccented(column)} ~* ${pattern}`),
    ...(isFuzzyToken(token)
      ? columns.map(
          (column) =>
            sql`${unaccented(column)} %> immutable_unaccent(${token})`,
        )
      : []),
  ];
  return sql<SqlBool>`(${sql.join(arms, sql` OR `)})`;
}

export function tokenFilters(
  columns: readonly string[],
  value: string,
  extraArm?: (token: string) => Expression<SqlBool>,
): Expression<SqlBool>[] {
  const tokens = searchTokens(value);
  if (tokens.length === 0) return [sql<SqlBool>`false`];
  return tokens.map((token) =>
    matchesToken(columns, token, extraArm ? [extraArm(token)] : []),
  );
}

export function searchFilters(search: string): Expression<SqlBool>[] {
  return tokenFilters(SEARCHED_COLUMNS, search, matchesIgsnExactly);
}

export async function applyFuzzyThreshold(
  trx: Transaction<DB>,
  values: readonly (string | undefined)[],
): Promise<void> {
  const fuzzy = values.some(
    (value) => value !== undefined && searchTokens(value).some(isFuzzyToken),
  );
  if (!fuzzy) return;
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
        sql`word_similarity(immutable_unaccent(${needle}), ${unaccented(column)})`,
    ),
  )})`;
}
