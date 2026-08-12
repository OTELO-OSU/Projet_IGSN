import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { Kysely } from "kysely";

import { userSchema } from "@projet-igsn/domain/user/model";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";
import { searchUsers } from "./search-users.ts";

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

// upsert provisions the caller from their verified token on every authenticated
// request: email is the identity key, so this also adopts a row seeded for that
// email and keeps the samples already assigned to it (ADR 0019).
// ponytail: one write per admin request. Fine at a few researchers; read first
// and write only on a change if the write volume ever matters.
export function createUserRepository(db: Kysely<DB>): UserRepository {
  return {
    upsert: ({ email, name, firstname }) =>
      withTransaction(db, async (trx) => {
        // status and super_admin are moderation state: the token never carries
        // them, so the update on conflict must not touch them.
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
    list: ({
      page,
      perPage,
      status,
      institutionalOrganization,
      institutionalOsu,
      institutionalLaboratory,
    }) =>
      withTransaction(db, async (trx) => {
        // The object form of `and` drops the undefined filters and yields
        // `1 = 1` when they are all absent.
        const matching = trx.selectFrom("user").where((eb) =>
          eb.and({
            status,
            institutional_organization: institutionalOrganization,
            institutional_osu: institutionalOsu,
            institutional_laboratory: institutionalLaboratory,
          }),
        );
        const rows = await matching
          .select(USER_COLUMNS)
          .orderBy("email", "asc")
          .limit(perPage)
          .offset((page - 1) * perPage)
          .execute();
        const { count } = await matching
          .select((eb) => eb.fn.countAll<number>().as("count"))
          .executeTakeFirstOrThrow();
        return {
          data: rows.map((row) => userSchema.parse(row)),
          total: Number(count),
        };
      }),
    get: (id) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .selectFrom("user")
          .select(USER_COLUMNS)
          .where("id", "=", id)
          .executeTakeFirst();
        return row ? userSchema.parse(row) : null;
      }),
    listPending: () =>
      withTransaction(db, (trx) =>
        trx
          .selectFrom("user")
          .select(["email", "name", "firstname", "created_at as createdAt"])
          .where("status", "=", "pending")
          .orderBy("created_at", "asc")
          .orderBy("email", "asc")
          .execute(),
      ),
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
    setStatus: (id, status) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .updateTable("user")
          .set({ status })
          .where("id", "=", id)
          .returning(USER_COLUMNS)
          .executeTakeFirst();
        return row ? userSchema.parse(row) : null;
      }),
    search: (query, callerId, excludeCollaboratorsOf) =>
      withTransaction(db, (trx) =>
        searchUsers(trx, query, callerId, excludeCollaboratorsOf),
      ),
    // One guarded statement, not a catch on the unique violation: an aborted
    // transaction would poison the caller's (no savepoints, transactions rule).
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
    // ponytail: one guarded statement, no read-then-write; the null guard in the where makes the first set win and answers 409 for the rest
    setInstitutionalGroups: async (userId, groups) => {
      const row = await withTransaction(db, (trx) =>
        trx
          .updateTable("user")
          .set({
            institutional_organization: groups.institutionalOrganization,
            institutional_osu: groups.institutionalOsu ?? null,
            institutional_laboratory: groups.institutionalLaboratory,
          })
          .where("id", "=", userId)
          .where("institutional_organization", "is", null)
          .returning(USER_COLUMNS)
          .executeTakeFirst(),
      );
      return row ? userSchema.parse(row) : null;
    },
    findByOrcid: async (orcid) => {
      const row = await withTransaction(db, (trx) =>
        trx
          .selectFrom("user")
          .select(USER_COLUMNS)
          .where("orcid", "=", orcid)
          .executeTakeFirst(),
      );
      return row && userSchema.parse(row);
    },
  };
}
