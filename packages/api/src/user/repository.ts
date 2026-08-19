import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { ExpressionBuilder, Kysely } from "kysely";

import { userSchema } from "@projet-igsn/domain/user/model";
import { settableUserStatuses } from "@projet-igsn/domain/user/settable-user-statuses";
import { adminUserSchema } from "@projet-igsn/domain/user/user-validator";
import { HTTPException } from "hono/http-exception";
import { sql } from "kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";
import { searchUsers } from "./search-users.ts";
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
      .select(["manual_group.id", "manual_group.name"])
      .whereRef("manual_group_member.user_id", "=", "user.id")
      .orderBy("manual_group.name", "asc"),
  ).as("manualGroups");

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
          .select(manualGroups)
          .orderBy("email", "asc")
          .limit(perPage)
          .offset((page - 1) * perPage)
          .execute();
        const { count } = await matching
          .select((eb) => eb.fn.countAll<number>().as("count"))
          .executeTakeFirstOrThrow();
        return {
          data: rows.map((row) => adminUserSchema.parse(row)),
          total: Number(count),
        };
      }),
    get: (id) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .selectFrom("user")
          .select(USER_COLUMNS)
          .select(manualGroups)
          .where("id", "=", id)
          .executeTakeFirst();
        return row ? adminUserSchema.parse(row) : null;
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
    update: (id, user) =>
      withTransaction(db, async (trx) => {
        const previous = await trx
          .selectFrom("user")
          .select("status")
          .where("id", "=", id)
          .forUpdate()
          .executeTakeFirst();
        if (!previous) {
          throw new HTTPException(404, { message: "User not found" });
        }
        if (!settableUserStatuses(previous.status).includes(user.status)) {
          throw new HTTPException(422, { message: "Invalid status" });
        }

        const { joined, leftIds } = await upsertUserManualGroups(
          trx,
          id,
          user.manualGroupIds,
          user.status,
        );
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
          .where("id", "=", id)
          .executeTakeFirstOrThrow();
        return {
          user: adminUserSchema.parse(row),
          previousStatus: previous.status,
          joinedGroups: joined,
          leftGroupIds: leftIds,
        };
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
