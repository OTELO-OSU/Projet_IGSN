import {
  MAX_TOKEN_LENGTH,
  parseSearchToken,
  searchTokens,
} from "@projet-igsn/domain/sample/search/search-tokens";
import {
  type Expression,
  type RawBuilder,
  sql,
  type SqlBool,
  type Transaction,
} from "kysely";

import type { DB } from "../../db.ts";

import { fuzzyThreshold } from "./fuzzy-threshold.ts";

const SEARCHED_TEXTS = [
  "name_unaccented",
  "specific_name_unaccented",
  "local_id_unaccented",
].map((column) => sql.ref(column));

const FUZZY_MIN_LENGTH = 5;

const ESCAPED_GROUP = "\\\\\\1";

const TANTIVY_REGEX_PUNCTUATION = "([!-/:;=?@[-`{-~])";

function literalSegment(value: string) {
  return sql`regexp_replace(immutable_unaccent(${value}), '([^[:alnum:]])', ${ESCAPED_GROUP}, 'g')`;
}

function tokenPattern(token: string, inline: boolean) {
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
  const pattern = sql.join(pieces, sql` || `);
  return inline ? sql`(${pattern})` : sql`(SELECT ${pattern})`;
}

function termSegment(value: string) {
  return sql`regexp_replace(lower(immutable_unaccent(${value})), ${TANTIVY_REGEX_PUNCTUATION}, ${ESCAPED_GROUP}, 'g')`;
}

function termRegex(token: string) {
  const { segments, anchorStart, anchorEnd } = parseSearchToken(token);
  const pieces = [
    ...(anchorStart ? [] : [sql`'.*'`]),
    ...segments
      .filter((segment) => segment !== "")
      .flatMap((segment, index) =>
        index === 0
          ? [termSegment(segment)]
          : [sql`'.*'`, termSegment(segment)],
      ),
    ...(anchorEnd ? [] : [sql`'.*'`]),
  ];
  return sql.join(pieces, sql` || `);
}

function isFuzzyToken(token: string): boolean {
  return token.length >= FUZZY_MIN_LENGTH && !token.includes("*");
}

export function matchesToken(
  texts: readonly RawBuilder<unknown>[],
  token: string,
  extraArms: Expression<SqlBool>[] = [],
  inline = false,
): Expression<SqlBool> {
  const pattern = tokenPattern(token, inline);
  const arms = [
    ...extraArms,
    ...texts.map((text) => sql`${text} ~* ${pattern}`),
    ...(isFuzzyToken(token)
      ? texts.map((text) => sql`${text} %> immutable_unaccent(${token})`)
      : []),
  ];
  return sql<SqlBool>`(${sql.join(arms, sql` OR `)})`;
}

export function tokenFilters(
  texts: readonly RawBuilder<unknown>[],
  value: string,
  extraArm?: (token: string) => Expression<SqlBool>,
  inline = false,
): Expression<SqlBool>[] {
  const tokens = searchTokens(value);
  if (tokens.length === 0) return [sql<SqlBool>`false`];
  return tokens.map((token) =>
    matchesToken(texts, token, extraArm ? [extraArm(token)] : [], inline),
  );
}

function matchesSearchToken(token: string): Expression<SqlBool> {
  if (token.length > MAX_TOKEN_LENGTH) return sql<SqlBool>`false`;
  const regex = termRegex(token);
  const arms = [
    sql`igsn = upper(${token})`,
    ...SEARCHED_TEXTS.map((text) => sql`${text} @@@ pdb.regex(${regex})`),
    ...(isFuzzyToken(token)
      ? SEARCHED_TEXTS.map(
          (text) =>
            sql`${text} === (lower(immutable_unaccent(${token})))::pdb.fuzzy(1, f, t)`,
        )
      : []),
  ];
  return sql<SqlBool>`(${sql.join(arms, sql` OR `)})`;
}

export function searchFilters(search: string): Expression<SqlBool>[] {
  const tokens = searchTokens(search);
  if (tokens.length === 0) return [sql<SqlBool>`false`];
  return tokens.map(matchesSearchToken);
}

export async function forceCustomPlan(trx: Transaction<DB>): Promise<void> {
  // ponytail: ParadeDB ignores Params in heap filters under generic plans (paradedb#6492), drop once pg_search handles them
  await sql`set local plan_cache_mode = force_custom_plan`.execute(trx);
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

export function relevanceScore(search: string): RawBuilder<number> | undefined {
  const tokens = searchTokens(search).filter((token) => !token.includes("*"));
  const needle = tokens.join(" ");
  if (!needle) return undefined;
  const similarity = sql<number>`GREATEST(${sql.join(
    SEARCHED_TEXTS.map(
      (text) => sql`word_similarity(immutable_unaccent(${needle}), ${text})`,
    ),
  )})`;
  if (tokens.length > 1) return similarity;
  const pattern = sql`(SELECT '\\m' || ${literalSegment(needle)} || '\\M')`;
  return sql<number>`CASE WHEN ${sql.join(
    SEARCHED_TEXTS.map((text) => sql`${text} ~* ${pattern}`),
    sql` OR `,
  )} THEN 1 ELSE ${similarity} END`;
}
