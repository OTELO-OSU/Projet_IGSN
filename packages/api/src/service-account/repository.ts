import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type { ServiceAccountBody } from "@projet-igsn/domain/service-account/service-account-validator";
import type { ManagedGroups } from "@projet-igsn/domain/user/managed-groups";
import type { Kysely } from "kysely";

import { serviceAccountSchema } from "@projet-igsn/domain/service-account/model";
import { knownManagedCodes } from "@projet-igsn/domain/user/managed-groups";
import { HTTPException } from "hono/http-exception";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import {
  managedGroupsOf,
  replaceManagedGroups,
  SERVICE_ACCOUNT_MANAGED_GROUP_TABLES,
} from "../managed-groups.ts";
import { type Transactional, withTransaction } from "../transaction.ts";
import { isNameTakenBy, lockName } from "../unique-name.ts";

const notFound = () =>
  new HTTPException(404, { message: "Service account not found" });

const selectAccounts = (trx: Transactional<DB>) =>
  trx
    .selectFrom("service_account")
    .select((eb) => [
      "id",
      "name",
      "institutional_organization as institutionalOrganization",
      "institutional_osu as institutionalOsu",
      "institutional_laboratory as institutionalLaboratory",
      managedGroupsOf(
        SERVICE_ACCOUNT_MANAGED_GROUP_TABLES,
        "service_account.id",
      ),
      jsonObjectFrom(
        eb
          .selectFrom("user")
          .select(["id", "email", "name", "firstname", "orcid"])
          .whereRef("user.id", "=", "service_account.owner_id"),
      ).as("owner"),
    ]);

const toServiceAccount = (row: { managedGroups: ManagedGroups }) =>
  serviceAccountSchema.parse({
    ...row,
    managedGroups: knownManagedCodes(row.managedGroups),
  });

const accountRow = ({
  name,
  ownerId,
  institutionalOrganization,
  institutionalOsu,
  institutionalLaboratory,
}: ServiceAccountBody) => ({
  name,
  owner_id: ownerId,
  institutional_organization: institutionalOrganization,
  institutional_osu: institutionalOsu,
  institutional_laboratory: institutionalLaboratory,
});

const assertOwnerAccepted = async (trx: Transactional<DB>, ownerId: string) => {
  const owner = await trx
    .selectFrom("user")
    .select("id")
    .where("id", "=", ownerId)
    .where("status", "=", "accepted")
    .executeTakeFirst();
  if (!owner) {
    throw new HTTPException(404, { message: "Owner not found" });
  }
};

const readAccount = async (trx: Transactional<DB>, id: string) => {
  const row = await selectAccounts(trx).where("id", "=", id).executeTakeFirst();
  if (!row) {
    throw notFound();
  }
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
    get: (id) => withTransaction(db, (trx) => readAccount(trx, id)),
    create: (body) =>
      withTransaction(db, async (trx) => {
        await assertOwnerAccepted(trx, body.ownerId);
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
        await replaceManagedGroups(
          trx,
          SERVICE_ACCOUNT_MANAGED_GROUP_TABLES,
          row.id,
          body.managedGroups,
        );
        return readAccount(trx, row.id);
      }),
    update: (id, body) =>
      withTransaction(db, async (trx) => {
        await assertOwnerAccepted(trx, body.ownerId);
        await lockName(trx, body.name);
        if (await isNameTakenBy(trx, "service_account", body.name, id)) {
          return "name_taken";
        }
        const row = await trx
          .updateTable("service_account")
          .set(accountRow(body))
          .where("id", "=", id)
          .returning("id")
          .executeTakeFirst();
        if (!row) {
          throw notFound();
        }
        await replaceManagedGroups(
          trx,
          SERVICE_ACCOUNT_MANAGED_GROUP_TABLES,
          id,
          body.managedGroups,
        );
        return readAccount(trx, id);
      }),
    listByOwner: (ownerId) =>
      withTransaction(db, (trx) =>
        trx
          .selectFrom("service_account")
          .select((eb) => [
            "id",
            "name",
            eb("api_key_hash", "is not", null)
              .$castTo<boolean>()
              .as("hasApiKey"),
          ])
          .where("owner_id", "=", ownerId)
          .orderBy("name", "asc")
          .execute(),
      ),
    rotateApiKey: (id, ownerId, hash) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .updateTable("service_account")
          .set({ api_key_hash: hash })
          .where("id", "=", id)
          .where("owner_id", "=", ownerId)
          .returning("id")
          .executeTakeFirst();
        if (!row) {
          throw notFound();
        }
      }),
    findByApiKeyHash: (hash) =>
      withTransaction(db, async (trx) => {
        const row = await selectAccounts(trx)
          .where("api_key_hash", "=", hash)
          .where((eb) =>
            eb.exists(
              eb
                .selectFrom("user")
                .select("user.id")
                .whereRef("user.id", "=", "service_account.owner_id")
                .where("user.status", "=", "accepted"),
            ),
          )
          .executeTakeFirst();
        return row && toServiceAccount(row);
      }),
    remove: (id) =>
      withTransaction(db, async (trx) => {
        const { numDeletedRows } = await trx
          .deleteFrom("service_account")
          .where("id", "=", id)
          .executeTakeFirst();
        if (numDeletedRows === 0n) {
          throw notFound();
        }
      }),
  };
}
