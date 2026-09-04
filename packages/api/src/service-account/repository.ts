import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type { ServiceAccountBody } from "@projet-igsn/domain/service-account/service-account-validator";
import type { ManagedGroups } from "@projet-igsn/domain/user/managed-groups";
import type { Kysely, Transaction } from "kysely";

import { serviceAccountSchema } from "@projet-igsn/domain/service-account/model";
import {
  knownManagedCodes,
  MANAGED_GROUP_KINDS,
} from "@projet-igsn/domain/user/managed-groups";
import { HTTPException } from "hono/http-exception";
import { sql } from "kysely";
import { jsonBuildObject } from "kysely/helpers/postgres";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import { assertManualGroupsExist } from "../manual-group/manual-groups-by-ids.ts";
import { type Transactional, withTransaction } from "../transaction.ts";

const ACCOUNT_COLUMNS = [
  "id",
  "name",
  "institutional_organization as institutionalOrganization",
  "institutional_osu as institutionalOsu",
  "institutional_laboratory as institutionalLaboratory",
] as const;

const managedCodes = (
  kind: DB["service_account_managed_institutional_group"]["kind"],
) =>
  sql<string[]>`coalesce((
    select array_agg(code order by code)
      from service_account_managed_institutional_group
     where service_account_managed_institutional_group.service_account_id = service_account.id
       and service_account_managed_institutional_group.kind = ${kind}
  ), '{}')`;

const managedGroups = jsonBuildObject({
  organizations: managedCodes("organization"),
  osus: managedCodes("osu"),
  laboratories: managedCodes("laboratory"),
  manualGroupIds: sql<string[]>`coalesce((
    select array_agg(group_id order by group_id)
      from service_account_managed_manual_group
     where service_account_managed_manual_group.service_account_id = service_account.id
  ), '{}')`,
}).as("managedGroups");

const selectAccounts = (trx: Transactional<DB>) =>
  trx.selectFrom("service_account").select([...ACCOUNT_COLUMNS, managedGroups]);

const toServiceAccount = (row: { managedGroups: ManagedGroups }) =>
  serviceAccountSchema.parse({
    ...row,
    managedGroups: knownManagedCodes(row.managedGroups),
  });

const accountRow = ({
  name,
  institutionalOrganization,
  institutionalOsu,
  institutionalLaboratory,
}: ServiceAccountBody) => ({
  name,
  institutional_organization: institutionalOrganization,
  institutional_osu: institutionalOsu,
  institutional_laboratory: institutionalLaboratory,
});

const lockName = (trx: Transaction<DB>, name: string) =>
  sql`select pg_advisory_xact_lock(hashtext(${name.toLowerCase()}))`.execute(
    trx,
  );

const replaceManagedGroups = async (
  trx: Transaction<DB>,
  serviceAccountId: string,
  groups: ManagedGroups,
): Promise<void> => {
  await assertManualGroupsExist(trx, groups.manualGroupIds);
  await trx
    .deleteFrom("service_account_managed_institutional_group")
    .where("service_account_id", "=", serviceAccountId)
    .execute();
  await trx
    .deleteFrom("service_account_managed_manual_group")
    .where("service_account_id", "=", serviceAccountId)
    .execute();
  const rows = MANAGED_GROUP_KINDS.flatMap(([key, kind]) =>
    groups[key].map((code) => ({
      service_account_id: serviceAccountId,
      kind,
      code,
    })),
  );
  if (rows.length > 0) {
    await trx
      .insertInto("service_account_managed_institutional_group")
      .values(rows)
      .execute();
  }
  if (groups.manualGroupIds.length > 0) {
    await trx
      .insertInto("service_account_managed_manual_group")
      .values(
        groups.manualGroupIds.map((groupId) => ({
          service_account_id: serviceAccountId,
          group_id: groupId,
        })),
      )
      .execute();
  }
};

const readAccount = async (trx: Transaction<DB>, id: string) => {
  const row = await selectAccounts(trx)
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
  return toServiceAccount(row);
};

export function createServiceAccountRepository(
  db: Kysely<DB>,
): ServiceAccountRepository {
  return {
    list: ({ page, perPage }) =>
      withTransaction(db, async (trx) => {
        const rows = await selectAccounts(trx)
          .orderBy("name", "asc")
          .limit(perPage)
          .offset((page - 1) * perPage)
          .execute();
        const { count } = await trx
          .selectFrom("service_account")
          .select((eb) => eb.fn.countAll<number>().as("count"))
          .executeTakeFirstOrThrow();
        return { data: rows.map(toServiceAccount), total: Number(count) };
      }),
    get: (id) =>
      withTransaction(db, async (trx) => {
        const row = await selectAccounts(trx)
          .where("id", "=", id)
          .executeTakeFirst();
        return row ? toServiceAccount(row) : null;
      }),
    create: (body) =>
      withTransaction(db, async (trx) => {
        await lockName(trx, body.name);
        const row = await trx
          .insertInto("service_account")
          .values({ id: uuidv7(), ...accountRow(body) })
          .onConflict((oc) => oc.doNothing())
          .returning("id")
          .executeTakeFirst();
        if (!row) {
          return "name_taken";
        }
        await replaceManagedGroups(trx, row.id, body.managedGroups);
        return readAccount(trx, row.id);
      }),
    update: (id, body) =>
      withTransaction(db, async (trx) => {
        await lockName(trx, body.name);
        const taken = await trx
          .selectFrom("service_account")
          .select("id")
          .where(sql`lower(name)`, "=", body.name.toLowerCase())
          .where("id", "<>", id)
          .executeTakeFirst();
        if (taken) {
          return "name_taken";
        }
        const row = await trx
          .updateTable("service_account")
          .set(accountRow(body))
          .where("id", "=", id)
          .returning("id")
          .executeTakeFirst();
        if (!row) {
          throw new HTTPException(404, {
            message: "Service account not found",
          });
        }
        await replaceManagedGroups(trx, id, body.managedGroups);
        return readAccount(trx, id);
      }),
    remove: (id) =>
      withTransaction(db, async (trx) => {
        const { numDeletedRows } = await trx
          .deleteFrom("service_account")
          .where("id", "=", id)
          .executeTakeFirst();
        if (numDeletedRows === 0n) {
          throw new HTTPException(404, {
            message: "Service account not found",
          });
        }
      }),
  };
}
