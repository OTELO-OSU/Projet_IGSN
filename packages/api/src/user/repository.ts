import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { Kysely } from "kysely";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";
import { searchUsers } from "./search-users.ts";

const columns = ["id", "email", "name", "firstname", "orcid"] as const;

// Provisions the caller from their verified token on every authenticated
// request: email is the identity key, so this also adopts a row seeded for that
// email and keeps the samples already assigned to it (ADR 0019).
// ponytail: one write per admin request. Fine at a few researchers; read first
// and write only on a change if the write volume ever matters.
export function createUserRepository(db: Kysely<DB>): UserRepository {
  return {
    upsert: ({ email, name, firstname }) =>
      withTransaction(db, (trx) =>
        trx
          .insertInto("user")
          .values({ id: uuidv7(), email, name, firstname })
          .onConflict((oc) =>
            oc.column("email").doUpdateSet({ name, firstname }),
          )
          .returning(columns)
          .executeTakeFirstOrThrow(),
      ),
    search: (query, callerId) =>
      withTransaction(db, (trx) => searchUsers(trx, query, callerId)),
    // One guarded statement, not a catch on the unique violation: an aborted
    // transaction would poison the caller's (no savepoints, transactions rule).
    // ponytail: a concurrent claim of the same orcid can still trip the unique
    // constraint into a 500; the constraint keeps it correct, retry shows 409.
    setOrcid: async (userId, orcid) =>
      (await withTransaction(db, (trx) =>
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
          .returning(columns)
          .executeTakeFirst(),
      )) ?? null,
    findByOrcid: (orcid) =>
      withTransaction(db, (trx) =>
        trx
          .selectFrom("user")
          .select(columns)
          .where("orcid", "=", orcid)
          .executeTakeFirst(),
      ),
  };
}
