import type {
  DuplicateCriteria,
  SuspectedDuplicate,
} from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import type { RawBuilder, SqlBool } from "kysely";

import { suspectedDuplicateSchema } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import { sql } from "kysely";
import { z } from "zod";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { unaccented } from "../../unaccented.ts";

const DUPLICATE_SEARCH_LIMIT = 20;

const normalized = (value: RawBuilder<unknown>) =>
  sql`lower(btrim(${unaccented(value)}))`;

const sameText = (left: RawBuilder<unknown>, right: RawBuilder<unknown>) =>
  sql<SqlBool>`${normalized(left)} = ${normalized(right)}`;

const text = (value: string | null) => sql`${value}::text`;

const HAS_COLLECTOR = sql<SqlBool>`(c.sc_collector_user_id is not null or c.sc_collector_firstname is not null or c.sc_collector_lastname is not null)`;

function sameCollector({
  collectorUserId,
  collectorFirstname,
  collectorLastname,
}: DuplicateCriteria) {
  if (
    collectorUserId === null &&
    collectorFirstname === null &&
    collectorLastname === null
  )
    return sql<SqlBool>`not ${HAS_COLLECTOR}`;
  const sameNames = (first: RawBuilder<unknown>, last: RawBuilder<unknown>) =>
    sql<SqlBool>`${sameText(
      sql`coalesce(c.sc_collector_firstname, cu.firstname)`,
      first,
    )} and ${sameText(sql`coalesce(c.sc_collector_lastname, cu.name)`, last)}`;
  if (collectorUserId === null)
    return sameNames(text(collectorFirstname), text(collectorLastname));
  const account = (column: string) =>
    sql`(select ${sql.ref(column)} from "user" u where u.id = ${collectorUserId}::uuid)`;
  return sql<SqlBool>`case when c.sc_collector_user_id is null then ${HAS_COLLECTOR} and ${sameNames(account("u.firstname"), account("u.name"))} else c.sc_collector_user_id = ${collectorUserId}::uuid end`;
}

export async function findDuplicateSamples(
  db: Transactional<DB>,
  criteria: DuplicateCriteria,
  exclude?: string,
): Promise<SuspectedDuplicate[]> {
  const rows = await db
    .selectFrom("sample as c")
    .leftJoin("user as cu", "cu.id", "c.sc_collector_user_id")
    .select(["c.id", "c.igsn", "c.name"])
    .where((eb) =>
      eb.and([
        eb("c.status", "=", "published"),
        sameText(sql.ref("c.name"), text(criteria.name)),
        sql<SqlBool>`c.material = ${criteria.material}::ltree`,
        sameCollector(criteria),
        ...(exclude === undefined ? [] : [eb("c.id", "<>", exclude)]),
      ]),
    )
    .orderBy("c.igsn")
    .limit(DUPLICATE_SEARCH_LIMIT)
    .execute();
  return z.array(suspectedDuplicateSchema).parse(rows);
}
