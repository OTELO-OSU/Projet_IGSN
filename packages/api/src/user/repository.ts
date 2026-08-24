import type { ManagedGroups } from "@projet-igsn/domain/user/managed-groups";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { ExpressionBuilder, Kysely } from "kysely";

import { isSpaceManager } from "@projet-igsn/domain/user/is-space-manager";
import {
  knownManagedCodes,
  NO_MANAGED_GROUPS,
} from "@projet-igsn/domain/user/managed-groups";
import { userSchema } from "@projet-igsn/domain/user/model";
import { settableUserStatuses } from "@projet-igsn/domain/user/settable-user-statuses";
import { userManagementRights } from "@projet-igsn/domain/user/user-management-rights";
import {
  adminUserSchema,
  listedUserSchema,
} from "@projet-igsn/domain/user/user-validator";
import { HTTPException } from "hono/http-exception";
import { sql } from "kysely";
import { jsonArrayFrom, jsonBuildObject } from "kysely/helpers/postgres";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import { canDetachFromGroup } from "../manual-group/can-detach-from-group.ts";
import { withTransaction } from "../transaction.ts";
import { moderationScopeWhere } from "./moderation-scope-where.ts";
import { searchUsers } from "./search-users.ts";
import { updateUserStatusAndInstitutions } from "./update-user-status-and-institutions.ts";
import { upsertUserManagedGroups } from "./upsert-user-managed-groups.ts";
import { upsertUserManualGroups } from "./upsert-user-manual-groups.ts";

const USER_COLUMNS = [
  "id",
  "email",
  "name",
  "firstname",
  "orcid",
  "status",
  "super_admin as superAdmin",
  "institutional_organization as institutionalOrganization",
  "institutional_osu as institutionalOsu",
  "institutional_laboratory as institutionalLaboratory",
] as const;

const manualGroups = (eb: ExpressionBuilder<DB, "user">) =>
  jsonArrayFrom(
    eb
      .selectFrom("manual_group")
      .innerJoin(
        "manual_group_member",
        "manual_group_member.group_id",
        "manual_group.id",
      )
      .select((inner) => [
        "manual_group.id",
        "manual_group.name",
        canDetachFromGroup(eb.ref("user.id"), inner.ref("manual_group.id")).as(
          "canDetach",
        ),
      ])
      .whereRef("manual_group_member.user_id", "=", "user.id")
      .orderBy("manual_group.name", "asc"),
  ).as("manualGroups");

const managedCodes = (kind: DB["user_managed_institutional_group"]["kind"]) =>
  sql<string[]>`coalesce((
    select array_agg(code order by code)
      from user_managed_institutional_group
     where user_managed_institutional_group.user_id = "user".id
       and user_managed_institutional_group.kind = ${kind}
  ), '{}')`;

const managedGroups = jsonBuildObject({
  organizations: managedCodes("organization"),
  osus: managedCodes("osu"),
  laboratories: managedCodes("laboratory"),
  manualGroupIds: sql<string[]>`coalesce((
    select array_agg(group_id order by group_id)
      from user_managed_manual_group
     where user_managed_manual_group.user_id = "user".id
  ), '{}')`,
}).as("managedGroups");

const toAdminUser = (row: { managedGroups: ManagedGroups }) =>
  adminUserSchema.parse({
    ...row,
    managedGroups: knownManagedCodes(row.managedGroups),
  });

// ponytail: one write per admin request. Fine at a few researchers; read first
// and write only on a change if the write volume ever matters.
export function createUserRepository(db: Kysely<DB>): UserRepository {
  return {
    upsert: ({ email, name, firstname }) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .insertInto("user")
          .values({ id: uuidv7(), email, name, firstname })
          .onConflict((oc) =>
            oc.column("email").doUpdateSet({ name, firstname }),
          )
          .returning(USER_COLUMNS)
          .executeTakeFirstOrThrow();
        return userSchema.parse(row);
      }),
    list: (
      {
        page,
        perPage,
        status,
        institutionalOrganization,
        institutionalOsu,
        institutionalLaboratory,
      },
      scope,
    ) =>
      withTransaction(db, async (trx) => {
        const matching = trx
          .selectFrom("user")
          .where((eb) =>
            eb.and({
              status,
              institutional_organization: institutionalOrganization,
              institutional_osu: institutionalOsu,
              institutional_laboratory: institutionalLaboratory,
            }),
          )
          .where((eb) => eb.and(moderationScopeWhere(eb, scope)));
        const rows = await matching
          .select(USER_COLUMNS)
          .select(manualGroups)
          .orderBy("email", "asc")
          .limit(perPage)
          .offset((page - 1) * perPage)
          .execute();
        const { count } = await matching
          .select((eb) => eb.fn.countAll<number>().as("count"))
          .executeTakeFirstOrThrow();
        return {
          data: rows.map((row) => listedUserSchema.parse(row)),
          total: Number(count),
        };
      }),
    get: (id, scope) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .selectFrom("user")
          .select(USER_COLUMNS)
          .select(manualGroups)
          .select(managedGroups)
          .where("id", "=", id)
          .where((eb) => eb.and(moderationScopeWhere(eb, scope)))
          .executeTakeFirst();
        return row ? toAdminUser(row) : null;
      }),
    getModerationScope: (userId) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .selectFrom("user")
          .select(managedGroups)
          .where("id", "=", userId)
          .where("status", "=", "accepted")
          .executeTakeFirst();
        return knownManagedCodes(row?.managedGroups ?? NO_MANAGED_GROUPS);
      }),
    listPending: () =>
      withTransaction(db, (trx) =>
        trx
          .selectFrom("user")
          .select([
            "email",
            "name",
            "firstname",
            "created_at as createdAt",
            "institutional_laboratory as institutionalLaboratory",
          ])
          .where("status", "=", "pending")
          // TODO: hides a pending super admin from the super admins' own
          // digest too, until the PO says whether a manager may moderate one.
          .where("super_admin", "=", false)
          .orderBy("created_at", "asc")
          .orderBy("email", "asc")
          .execute(),
      ),
    // ponytail: reads every accepted row to filter managers in JS, fine at a
    // few hundred researchers; prefilter on the two managed tables in SQL if it
    // grows, the catalog test staying in JS since it drops a retired code.
    listSpaceManagers: () =>
      withTransaction(db, async (trx) => {
        const rows = await trx
          .selectFrom("user")
          .select(["id", "email"])
          .select(managedGroups)
          .where("status", "=", "accepted")
          .where("super_admin", "=", false)
          .orderBy("email", "asc")
          .execute();
        return rows
          .map(({ id, email, managedGroups: groups }) => ({
            id,
            email,
            groups: knownManagedCodes(groups),
          }))
          .filter(({ groups }) => isSpaceManager(groups));
      }),
    listSuperAdminEmails: () =>
      withTransaction(db, async (trx) => {
        const rows = await trx
          .selectFrom("user")
          .select("email")
          .where("super_admin", "=", true)
          .orderBy("email", "asc")
          .execute();
        return rows.map(({ email }) => email);
      }),
    update: (id, submitted, scope) =>
      withTransaction(db, async (trx) => {
        const previous = await trx
          .selectFrom("user")
          .select([
            "status",
            "institutional_organization as institutionalOrganization",
            "institutional_osu as institutionalOsu",
            "institutional_laboratory as institutionalLaboratory",
          ])
          .where("id", "=", id)
          .where((eb) => eb.and(moderationScopeWhere(eb, scope)))
          .forUpdate()
          .executeTakeFirst();
        if (!previous) {
          throw scope.superAdmin
            ? new HTTPException(404, { message: "User not found" })
            : new HTTPException(403, { message: "Forbidden" });
        }
        const rights = userManagementRights(scope, previous);
        const user = updateUserStatusAndInstitutions(
          submitted,
          previous,
          rights,
        );
        if (!settableUserStatuses(previous.status).includes(user.status)) {
          throw new HTTPException(422, { message: "Invalid status" });
        }

        const { joined, leftIds } = await upsertUserManualGroups(
          trx,
          id,
          submitted.manualGroupIds,
          user.status,
          scope,
        );
        if (rights.managedGroups) {
          await upsertUserManagedGroups(trx, id, submitted.managedGroups);
        }
        await trx
          .updateTable("user")
          .set({
            status: user.status,
            institutional_organization: user.institutionalOrganization,
            institutional_osu: user.institutionalOsu,
            institutional_laboratory: user.institutionalLaboratory,
          })
          .where("id", "=", id)
          .execute();

        const row = await trx
          .selectFrom("user")
          .select(USER_COLUMNS)
          .select(manualGroups)
          .select(managedGroups)
          .where("id", "=", id)
          .executeTakeFirstOrThrow();
        return {
          user: toAdminUser(row),
          previousStatus: previous.status,
          joinedGroups: joined,
          leftGroupIds: leftIds,
        };
      }),
    search: (callerId, filters) =>
      withTransaction(db, (trx) => searchUsers(trx, callerId, filters)),
    // ponytail: a concurrent claim of the same orcid can still trip the unique
    // constraint into a 500; the constraint keeps it correct, retry shows 409.
    setOrcid: async (userId, orcid) => {
      const row = await withTransaction(db, (trx) =>
        trx
          .updateTable("user")
          .set({ orcid })
          .where("id", "=", userId)
          .where((eb) =>
            eb.not(
              eb.exists(
                eb
                  .selectFrom("user as holder")
                  .select("holder.id")
                  .where("holder.orcid", "=", orcid)
                  .where("holder.id", "<>", userId),
              ),
            ),
          )
          .returning(USER_COLUMNS)
          .executeTakeFirst(),
      );
      return row ? userSchema.parse(row) : null;
    },
    setInstitutionalGroups: async (userId, groups) => {
      const osu = groups.institutionalOsu ?? null;
      await withTransaction(db, (trx) =>
        trx
          .updateTable("user")
          .set((eb) => ({
            institutional_organization: groups.institutionalOrganization,
            institutional_osu: osu,
            institutional_laboratory: groups.institutionalLaboratory,
            status: eb
              .case()
              .when("super_admin", "=", true)
              .then(eb.ref("status"))
              .when("institutional_organization", "is", null)
              .then(eb.ref("status"))
              .else("pending" as const)
              .end(),
          }))
          .where("id", "=", userId)
          .where(
            sql`(institutional_organization, institutional_osu, institutional_laboratory)`,
            "is distinct from",
            sql`(${groups.institutionalOrganization}, ${osu}, ${groups.institutionalLaboratory})`,
          )
          .execute(),
      );
    },
    findByOrcid: async (orcid) => {
      const row = await withTransaction(db, (trx) =>
        trx
          .selectFrom("user")
          .select(USER_COLUMNS)
          .where("orcid", "=", orcid.toUpperCase())
          .executeTakeFirst(),
      );
      return row && userSchema.parse(row);
    },
  };
}
