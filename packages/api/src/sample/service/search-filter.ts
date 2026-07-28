import {
  parseSearchToken,
  searchTokens,
} from "@projet-igsn/domain/sample/search/search-tokens";
import { type Expression, sql, type SqlBool, type Transaction } from "kysely";

import type { DB } from "../../db.ts";

import { fuzzyThreshold } from "./fuzzy-threshold.ts";

const SEARCHED_COLUMNS = ["name", "specific_name", "igsn"] as const;

// Typo tolerance is off igsn on purpose: it is Crockford base32 of a UUIDv7, so
// two samples minted in the same millisecond share ~10 leading characters.
const FUZZY_COLUMNS = ["name", "specific_name"] as const;

// One edit drops a 4-letter token under any useful threshold anyway.
const FUZZY_MIN_LENGTH = 5;

// regexp_replace replacement: a literal backslash, then the matched character.
const ESCAPED_GROUP = "\\\\\\1";

// Byte-for-byte the gin_trgm_ops index expression (migration 20260728092114):
// any difference drops the query back to a sequential scan.
function searchable(column: string) {
  return sql`immutable_unaccent(coalesce(${sql.ref(column)}, ''))`;
}

// Escaped after unaccent, never in JS: unaccent introduces metacharacters of
// its own ("©" becomes "(C)"). See ADR 0018.
function literalSegment(value: string) {
  return sql`regexp_replace(immutable_unaccent(${value}), '([^[:alnum:]])', ${ESCAPED_GROUP}, 'g')`;
}

// A scalar subquery, so the planner builds the pattern once, not per row.
function tokenPattern(token: string) {
  const { segments, anchorStart, anchorEnd } = parseSearchToken(token);
  // Doubled: a template literal would eat `\m` down to a bare `m`.
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

// A wildcard already expresses uncertainty, so it replaces typo tolerance.
function isFuzzyToken(token: string): boolean {
  return token.length >= FUZZY_MIN_LENGTH && !token.includes("*");
}

function matchesToken(token: string): Expression<SqlBool> {
  const pattern = tokenPattern(token);
  const arms = [
    ...SEARCHED_COLUMNS.map(
      (column) => sql`${searchable(column)} ~* ${pattern}`,
    ),
    // `%>` rather than word_similarity() > threshold: only the operator form
    // is index-supported. Its threshold is the GUC set below.
    ...(isFuzzyToken(token)
      ? FUZZY_COLUMNS.map(
          (column) =>
            sql`${searchable(column)} %> immutable_unaccent(${token})`,
        )
      : []),
  ];
  return sql<SqlBool>`(${sql.join(arms, sql` OR `)})`;
}

export function searchFilters(search: string): Expression<SqlBool>[] {
  const tokens = searchTokens(search);
  // A search that trims to blanks or bare wildcards asked for something;
  // answering with the whole registry would read as a filter silently dropped.
  return tokens.length === 0 ? [sql<SqlBool>`false`] : tokens.map(matchesToken);
}

// Transaction-local, so the GUC reverts on commit instead of leaking onto the
// pooled connection.
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

// Absent when every token carries a wildcard: word_similarity would then be a
// constant computed per row.
export function relevanceScore(search: string): Expression<number> | undefined {
  const needle = searchTokens(search)
    .filter((token) => !token.includes("*"))
    .join(" ");
  if (!needle) return undefined;
  return sql<number>`GREATEST(${sql.join(
    FUZZY_COLUMNS.map(
      (column) =>
        sql`word_similarity(immutable_unaccent(${needle}), ${searchable(column)})`,
    ),
  )})`;
}
