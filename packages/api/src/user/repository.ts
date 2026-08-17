import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { Kysely } from "kysely";

import { userSchema } from "@projet-igsn/domain/user/model";
import { sql } from "kysely";
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
    list: ({
      page,
      perPage,
      status,
      institutionalOrganization,
      institutionalOsu,
      institutionalLaboratory,
    }) =>
      withTransaction(db, async (trx) => {
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
    hasPublishedSample: (userId) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .selectFrom("user_sample")
          .innerJoin("sample", "sample.id", "user_sample.sample_id")
          .select("user_sample.user_id")
          .where("user_sample.user_id", "=", userId)
          .where("user_sample.role", "=", "owner")
          .where("sample.published", "=", true)
          .limit(1)
          .executeTakeFirst();
        return row !== undefined;
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
    search: (query, callerId, excludeCollaboratorsOf, status) =>
      withTransaction(db, (trx) =>
        searchUsers(trx, query, callerId, excludeCollaboratorsOf, status),
      ),
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
