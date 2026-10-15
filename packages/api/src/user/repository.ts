import type { ManagedGroups } from "@projet-igsn/domain/user/managed-groups";
import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { ExpressionBuilder, Kysely, Transaction } from "kysely";

import { laboratoryCodeOf } from "@projet-igsn/domain/institutional-group/laboratory-code-of";
import { laboratoryCodesWithPredecessors } from "@projet-igsn/domain/institutional-group/laboratory-codes-with-predecessors";
import { osuIdOf } from "@projet-igsn/domain/institutional-group/osu-id-of";
import { canBecomeSuperAdmin } from "@projet-igsn/domain/user/can-become-super-admin";
import { canSetSuperAdmin } from "@projet-igsn/domain/user/can-set-super-admin";
import { isSpaceManager } from "@projet-igsn/domain/user/is-space-manager";
import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import { userSchema } from "@projet-igsn/domain/user/model";
import { shouldRePendOnInstitutionsUpdate } from "@projet-igsn/domain/user/should-re-pend-on-institutions-update";
import { userManagementRights } from "@projet-igsn/domain/user/user-management-rights";
import {
  adminUserSchema,
  listedUserSchema,
  publicUserSchema,
} from "@projet-igsn/domain/user/user-validator";
import { HTTPException } from "hono/http-exception";
import { sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import {
  institutionCodes,
  laboratoryIdsOf,
  storedInstitutions,
} from "../institutional-group/stored-institution.ts";
import { likePattern } from "../like-pattern.ts";
import {
  knownManagedGroupCodes,
  managedGroupsOf,
  replaceManagedGroups,
  USER_MANAGED_GROUP_TABLES,
} from "../managed-groups.ts";
import { canDetachFromGroup } from "../manual-group/can-detach-from-group.ts";
import { withTransaction } from "../transaction.ts";
import { countUsersByInstitutionalGroup } from "./count-users-by-institutional-group.ts";
import { moderationScopeWhere } from "./moderation-scope-where.ts";
import { orphanedGroupsOfUser } from "./orphaned-groups-of-user.ts";
import { searchUsers } from "./search-users.ts";
import { updateUserStatusAndInstitutions } from "./update-user-status-and-institutions.ts";
import { upsertUserManualGroups } from "./upsert-user-manual-groups.ts";
import { userRoleWhere } from "./user-role-where.ts";

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

const managedGroups = managedGroupsOf(USER_MANAGED_GROUP_TABLES, "user.id");

const orphanedGroupsOnLeavingAccepted = (
  trx: Transaction<DB>,
  id: string,
  previousStatus: UserStatus,
  status: UserStatus,
) =>
  previousStatus === "accepted" && status !== "accepted"
    ? orphanedGroupsOfUser(trx, id)
    : Promise.resolve([]);

const toAdminUser = (
  row: Parameters<typeof institutionCodes>[0] & {
    managedGroups: ManagedGroups;
  },
) =>
  adminUserSchema.parse({
    ...institutionCodes(row),
    managedGroups: knownManagedGroupCodes(row.managedGroups),
  });

// ponytail: one write per admin request; read first and write only on a change if the write volume ever matters.
const lockUserInScope = async (
  trx: Transaction<DB>,
  id: string,
  scope: ModerationScope,
) => {
  const row = await trx
    .selectFrom("user")
    .select([
      "status",
      "super_admin as superAdmin",
      "institutional_organization as institutionalOrganization",
      "institutional_osu as institutionalOsu",
      "institutional_laboratory as institutionalLaboratory",
    ])
    .where("id", "=", id)
    .where((eb) => eb.and(moderationScopeWhere(eb, scope)))
    .forUpdate()
    .executeTakeFirst();
  if (!row) {
    throw scope.superAdmin
      ? new HTTPException(404, { message: "User not found" })
      : new HTTPException(403, { message: "Forbidden" });
  }
  return institutionCodes(row);
};

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
        return userSchema.parse(institutionCodes(row));
      }),
    list: (
      {
        page,
        perPage,
        status,
        search,
        institutionalOrganization,
        institutionalOsu,
        institutionalLaboratory,
        manualGroup,
        roles,
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
              institutional_osu: institutionalOsu && osuIdOf(institutionalOsu),
            }),
          )
          .$if(institutionalLaboratory !== undefined, (qb) =>
            qb.where(
              "institutional_laboratory",
              "in",
              laboratoryIdsOf(
                laboratoryCodesWithPredecessors(institutionalLaboratory!),
              ),
            ),
          )
          .where((eb) => eb.and(moderationScopeWhere(eb, scope)))
          .$if(search !== undefined, (qb) =>
            qb.where((eb) =>
              eb.or(
                (["name", "firstname", "email"] as const).map((column) =>
                  eb(column, "ilike", likePattern(search!)),
                ),
              ),
            ),
          )
          .$if(manualGroup !== undefined, (qb) =>
            qb.where((eb) =>
              eb.exists(
                eb
                  .selectFrom("manual_group_member")
                  .select("manual_group_member.user_id")
                  .whereRef("manual_group_member.user_id", "=", "user.id")
                  .where("manual_group_member.group_id", "=", manualGroup!),
              ),
            ),
          )
          .$if(roles !== undefined, (qb) =>
            qb.where((eb) =>
              eb.or(roles!.map((role) => userRoleWhere(eb, role))),
            ),
          );
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
          data: rows.map((row) =>
            listedUserSchema.parse(institutionCodes(row)),
          ),
          total: Number(count),
        };
      }),
    countByInstitutionalGroup: (scope) =>
      countUsersByInstitutionalGroup(db, scope),
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
        return knownManagedGroupCodes(row?.managedGroups ?? NO_MANAGED_GROUPS);
      }),
    listPublicUsers: (include) =>
      withTransaction(db, async (trx) => {
        const rows = await trx
          .selectFrom("user")
          .select(["id", "name", "firstname"])
          .where("status", "=", "accepted")
          .where((eb) =>
            eb.or([
              eb.exists(
                eb
                  .selectFrom("user_sample")
                  .innerJoin("sample", "sample.id", "user_sample.sample_id")
                  .select("sample.id")
                  .where("sample.status", "=", "published")
                  .whereRef("user_sample.user_id", "=", "user.id"),
              ),
              ...(include ? [eb("user.id", "=", include)] : []),
            ]),
          )
          .orderBy("name", "asc")
          .orderBy("firstname", "asc")
          .execute();
        return rows.map((row) => publicUserSchema.parse(row));
      }),
    listPending: () =>
      withTransaction(db, async (trx) => {
        const rows = await trx
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
          .execute();
        return rows.map((row) => ({
          ...row,
          institutionalLaboratory:
            row.institutionalLaboratory &&
            laboratoryCodeOf(row.institutionalLaboratory),
        }));
      }),
    // ponytail: reads every accepted row to filter managers in JS; prefilter on the two managed tables in SQL if it grows.
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
            groups: knownManagedGroupCodes(groups),
          }))
          .filter(({ groups }) => isSpaceManager(groups));
      }),
    listSuperAdminEmails: () =>
      withTransaction(db, async (trx) => {
        const rows = await trx
          .selectFrom("user")
          .select("email")
          .where("super_admin", "=", true)
          .where("status", "!=", "rejected")
          .orderBy("email", "asc")
          .execute();
        return rows.map(({ email }) => email);
      }),
    update: (id, submitted, scope) =>
      withTransaction(db, async (trx) => {
        const previous = await lockUserInScope(trx, id, scope);
        const rights = userManagementRights(scope, previous);
        const user = updateUserStatusAndInstitutions(
          submitted,
          previous,
          rights,
        );
        const superAdmin =
          canSetSuperAdmin(scope, id) && submitted.superAdmin !== undefined
            ? submitted.superAdmin
            : previous.superAdmin;
        if (
          superAdmin &&
          !previous.superAdmin &&
          !canBecomeSuperAdmin(user.status)
        ) {
          throw new HTTPException(422, {
            message: "Only an accepted user can become super admin",
          });
        }
        const { joined, leftIds } = await upsertUserManualGroups(
          trx,
          id,
          submitted.manualGroupIds,
          user.status,
          scope,
        );
        if (rights.managedGroups) {
          await replaceManagedGroups(
            trx,
            USER_MANAGED_GROUP_TABLES,
            id,
            submitted.managedGroups,
          );
        }
        const stored = storedInstitutions(user);
        await trx
          .updateTable("user")
          .set({
            status: stored.status,
            super_admin: superAdmin,
            institutional_organization: stored.institutionalOrganization,
            institutional_osu: stored.institutionalOsu,
            institutional_laboratory: stored.institutionalLaboratory,
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
          previousSuperAdmin: previous.superAdmin,
          joinedGroups: joined,
          leftGroupIds: leftIds,
          orphanedGroups: await orphanedGroupsOnLeavingAccepted(
            trx,
            id,
            previous.status,
            user.status,
          ),
        };
      }),
    removeInstitutionalGroups: (id, scope) =>
      withTransaction(db, async (trx) => {
        const previous = await lockUserInScope(trx, id, scope);
        const status = shouldRePendOnInstitutionsUpdate(previous, null)
          ? "pending"
          : previous.status;
        await trx
          .updateTable("user")
          .set({
            status,
            institutional_organization: null,
            institutional_osu: null,
            institutional_laboratory: null,
          })
          .where("id", "=", id)
          .execute();
        return {
          previousStatus: previous.status,
          status,
          orphanedGroups: await orphanedGroupsOnLeavingAccepted(
            trx,
            id,
            previous.status,
            status,
          ),
        };
      }),
    search: (callerId, filters) =>
      withTransaction(db, (trx) => searchUsers(trx, callerId, filters)),
    // ponytail: a concurrent claim of the same orcid can still trip the unique constraint into a 500.
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
      return row ? userSchema.parse(institutionCodes(row)) : null;
    },
    setInstitutionalGroups: (userId, submitted) => {
      const groups = storedInstitutions({
        ...submitted,
        institutionalOsu: submitted.institutionalOsu ?? null,
      });
      const osu = groups.institutionalOsu;
      return withTransaction(db, async (trx) => {
        const previous = await trx
          .selectFrom("user")
          .select("status")
          .where("id", "=", userId)
          .forUpdate()
          .executeTakeFirst();
        const updated = await trx
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
          .returning("status")
          .executeTakeFirst();
        return {
          orphanedGroups:
            previous && updated
              ? await orphanedGroupsOnLeavingAccepted(
                  trx,
                  userId,
                  previous.status,
                  updated.status,
                )
              : [],
        };
      });
    },
    acceptCharter: async (userId) => {
      await withTransaction(db, (trx) =>
        trx
          .updateTable("user")
          .set({
            charter_accepted_at: sql`coalesce(charter_accepted_at, now())`,
          })
          .where("id", "=", userId)
          .execute(),
      );
    },
    hasAcceptedCharter: async (userId) => {
      const row = await withTransaction(db, (trx) =>
        trx
          .selectFrom("user")
          .select("charter_accepted_at")
          .where("id", "=", userId)
          .executeTakeFirst(),
      );
      return Boolean(row?.charter_accepted_at);
    },
    findByOrcid: async (orcid) => {
      const row = await withTransaction(db, (trx) =>
        trx
          .selectFrom("user")
          .select(USER_COLUMNS)
          .where("orcid", "=", orcid.toUpperCase())
          .executeTakeFirst(),
      );
      return row && userSchema.parse(institutionCodes(row));
    },
  };
}
