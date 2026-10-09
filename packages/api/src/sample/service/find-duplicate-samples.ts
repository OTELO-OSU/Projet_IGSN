import type { BatchSuspectedDuplicate } from "@projet-igsn/domain/sample-batch/model";
import type {
  DuplicateCriteria,
  SuspectedDuplicate,
} from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import type { RawBuilder, SqlBool } from "kysely";

import { batchSuspectedDuplicateSchema } from "@projet-igsn/domain/sample-batch/model";
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

const HAS_COLLECTOR = sql<SqlBool>`(c.sc_collector_user_id is not null or c.sc_collector_firstname is not null or c.sc_collector_lastname is not null)`;

const sameNames = (first: RawBuilder<unknown>, last: RawBuilder<unknown>) =>
  sql<SqlBool>`${sameText(
    sql`coalesce(c.sc_collector_firstname, cu.firstname)`,
    first,
  )} and ${sameText(sql`coalesce(c.sc_collector_lastname, cu.name)`, last)}`;

const SAME_COLLECTOR = sql<SqlBool>`case
  when k.collector_user_id is not null and c.sc_collector_user_id is not null then c.sc_collector_user_id = k.collector_user_id
  when k.collector_user_id is not null then ${HAS_COLLECTOR} and ${sameNames(sql`ku.firstname`, sql`ku.name`)}
  when k.collector_firstname is null and k.collector_lastname is null then not ${HAS_COLLECTOR}
  else ${sameNames(sql`k.collector_firstname`, sql`k.collector_lastname`)}
end`;

type Key = {
  index: number;
  name: string;
  material: string;
  collector_user_id: string | null;
  collector_firstname: string | null;
  collector_lastname: string | null;
};

const keysOf = (criteria: readonly DuplicateCriteria[]) =>
  sql<Key>`jsonb_to_recordset(${JSON.stringify(
    criteria.map(
      (criterion, index): Key => ({
        index,
        name: criterion.name,
        material: criterion.material,
        collector_user_id: criterion.collectorUserId,
        collector_firstname: criterion.collectorFirstname,
        collector_lastname: criterion.collectorLastname,
      }),
    ),
  )}::text::jsonb)`.as<"k">(
    sql`k(index int, name text, material ltree, collector_user_id uuid, collector_firstname text, collector_lastname text)`,
  );

const duplicateRowsOfEach = async (
  db: Transactional<DB>,
  criteria: readonly DuplicateCriteria[],
  includeQueued: boolean,
  exclude?: string,
) => {
  if (criteria.length === 0) return [];
  const rows = await db
    .selectFrom(keysOf(criteria))
    .leftJoin("user as ku", "ku.id", "k.collector_user_id")
    .innerJoinLateral(
      (eb) =>
        eb
          .selectFrom("sample as c")
          .leftJoin("user as cu", "cu.id", "c.sc_collector_user_id")
          .select(["c.id", "c.igsn", "c.name"])
          .where((eb) =>
            eb.and([
              eb.or([
                eb("c.status", "=", "published"),
                ...(includeQueued
                  ? [
                      eb.and([
                        eb("c.status", "=", "draft"),
                        eb("c.synchronization_status", "=", "pending"),
                      ]),
                    ]
                  : []),
              ]),
              sameText(sql.ref("c.name"), sql`k.name`),
              sql<SqlBool>`c.material = k.material`,
              SAME_COLLECTOR,
              ...(exclude === undefined ? [] : [eb("c.id", "<>", exclude)]),
            ]),
          )
          .orderBy("c.igsn")
          .limit(DUPLICATE_SEARCH_LIMIT)
          .as("d"),
      (join) => join.onTrue(),
    )
    .select(["k.index", "d.id", "d.igsn", "d.name"])
    .orderBy("k.index")
    .orderBy("d.igsn")
    .execute();
  const byIndex = Map.groupBy(rows, ({ index }) => index);
  return criteria.map((_, index) => byIndex.get(index) ?? []);
};

export async function findDuplicateSamplesOfEach(
  db: Transactional<DB>,
  criteria: readonly DuplicateCriteria[],
  exclude?: string,
): Promise<SuspectedDuplicate[][]> {
  const rows = await duplicateRowsOfEach(db, criteria, false, exclude);
  return rows.map((duplicates) =>
    z.array(suspectedDuplicateSchema).parse(duplicates),
  );
}

export async function findDuplicateSamples(
  db: Transactional<DB>,
  criteria: DuplicateCriteria,
  exclude?: string,
): Promise<SuspectedDuplicate[]> {
  const [duplicates = []] = await findDuplicateSamplesOfEach(
    db,
    [criteria],
    exclude,
  );
  return duplicates;
}

export async function findBatchDuplicateSamples(
  db: Transactional<DB>,
  criteria: DuplicateCriteria,
  exclude?: string,
): Promise<BatchSuspectedDuplicate[]> {
  const [duplicates = []] = await duplicateRowsOfEach(
    db,
    [criteria],
    true,
    exclude,
  );
  return z.array(batchSuspectedDuplicateSchema).parse(duplicates);
}
