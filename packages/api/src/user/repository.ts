import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { Kysely } from "kysely";

import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import { userSchema } from "@projet-igsn/domain/user/model";
import { sql } from "kysely";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import { institutionCodes } from "../institutional-group/stored-institution.ts";
import { knownManagedGroupCodes } from "../managed-groups.ts";
import { transactionally, withTransaction } from "../transaction.ts";
import { countUsersByInstitutionalGroup } from "./count-users-by-institutional-group.ts";
import { getUser } from "./get-user.ts";
import { listPendingUsers } from "./list-pending-users.ts";
import { listPublicUsers } from "./list-public-users.ts";
import { listSpaceManagers } from "./list-space-managers.ts";
import { listUsers } from "./list-users.ts";
import { removeUserInstitutionalGroups } from "./remove-user-institutional-groups.ts";
import { searchUsers } from "./search-users.ts";
import { setUserInstitutionalGroups } from "./set-user-institutional-groups.ts";
import { updateUser } from "./update-user.ts";
import { USER_COLUMNS, userManagedGroups } from "./user-columns.ts";

export function createUserRepository(db: Kysely<DB>): UserRepository {
  const tx = transactionally(db);
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
    list: tx(listUsers),
    countByInstitutionalGroup: (scope) =>
      countUsersByInstitutionalGroup(db, scope),
    get: tx(getUser),
    getModerationScope: (userId) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .selectFrom("user")
          .select(userManagedGroups)
          .where("id", "=", userId)
          .where("status", "=", "accepted")
          .executeTakeFirst();
        return knownManagedGroupCodes(row?.managedGroups ?? NO_MANAGED_GROUPS);
      }),
    listPublicUsers: tx(listPublicUsers),
    listPending: tx(listPendingUsers),
    listSpaceManagers: tx(listSpaceManagers),
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
    update: tx(updateUser),
    removeInstitutionalGroups: tx(removeUserInstitutionalGroups),
    search: tx(searchUsers),
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
    setInstitutionalGroups: tx(setUserInstitutionalGroups),
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
