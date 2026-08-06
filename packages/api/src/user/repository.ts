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
] as const;

// Rows come back parsed, never cast: status is a text column (Zod owns the
// vocabulary), so a value outside it fails here instead of travelling on as a
// valid account.
//
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
    // Filtering and pagination run in the query, so the total describes the
    // whole filtered set rather than the page (server-side filtering rule).
    list: ({ page, perPage, status }) =>
      withTransaction(db, async (trx) => {
        // A builder is immutable, so both queries branch off this one.
        const matching =
          status === undefined
            ? trx.selectFrom("user")
            : trx.selectFrom("user").where("status", "=", status);
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
    search: (query, callerId) =>
      withTransaction(db, (trx) => searchUsers(trx, query, callerId)),
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
