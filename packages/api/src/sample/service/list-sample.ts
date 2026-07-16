import type {
  ListSamplesParams,
  ListSamplesResult,
} from "@projet-igsn/domain/sample/repository";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { readLocations } from "./read-location.ts";
import { toSample } from "./to-sample.ts";

// Case- and diacritic-insensitive match on name, specific_name and igsn.
// `search` is LIKE-escaped and bound as a parameter (never concatenated), and
// unaccent needs the migration-enabled Postgres extension.
// ponytail: seq scan (leading-wildcard ILIKE over unaccent() can't use a btree).
// Fine at registry scale; if the table grows, add pg_trgm GIN expression indexes
// on an IMMUTABLE unaccent() wrapper of each column.
function matchesSearch(search: string) {
  const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return sql<boolean>`(
    unaccent(name) ILIKE unaccent(${pattern})
    OR unaccent(specific_name) ILIKE unaccent(${pattern})
    OR unaccent(igsn) ILIKE unaccent(${pattern})
  )`;
}

export async function listSamples(
  db: Transactional<DB>,
  { page, perPage, sort, order = "asc", search }: ListSamplesParams,
  publishedOnly = false,
): Promise<ListSamplesResult> {
  const rows = await db
    .selectFrom("sample")
    .selectAll()
    .$if(publishedOnly, (qb) => qb.where("published", "=", true))
    .$if(search !== undefined, (qb) => qb.where(matchesSearch(search!)))
    // Status is IGSN presence; last-modified stays as the tiebreak.
    .$if(sort === "status", (qb) => qb.orderBy(sql`igsn is not null`, order))
    .orderBy("updated_at", "desc")
    .orderBy("id", "desc")
    .limit(perPage)
    .offset((page - 1) * perPage)
    .execute();

  const { count } = await db
    .selectFrom("sample")
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .$if(publishedOnly, (qb) => qb.where("published", "=", true))
    .$if(search !== undefined, (qb) => qb.where(matchesSearch(search!)))
    .executeTakeFirstOrThrow();

  const ids = rows.map((row) => row.id);
  const locations = await readLocations(db, ids);
  // One extra query for the whole page's age rows (0:1), keyed by sample id.
  const ageRows = ids.length
    ? await db
        .selectFrom("sample_age")
        .selectAll()
        .where("sample_id", "in", ids)
        .execute()
    : [];
  const ageById = new Map(ageRows.map((age) => [age.sample_id, age]));

  return {
    data: rows.map((row) =>
      toSample(row, locations.get(row.id) ?? null, ageById.get(row.id)),
    ),
    total: Number(count),
  };
}
