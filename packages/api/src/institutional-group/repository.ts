import type {
  InstitutionalGroupKind,
  InstitutionalGroupRef,
} from "@projet-igsn/domain/institutional-group/model";
import type { InstitutionalGroupRepository } from "@projet-igsn/domain/institutional-group/repository";
import type { InstitutionalGroupCounts } from "@projet-igsn/domain/user/user-validator";
import type { ExpressionBuilder, Kysely } from "kysely";

import { canJoinManualGroup } from "@projet-igsn/domain/manual-group/can-join-manual-group";
import { groupManagerSchema } from "@projet-igsn/domain/user/user-validator";
import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";

const RECORDED_KINDS = [
  ["organization", "institutional_organization"],
  ["osu", "institutional_osu"],
  ["laboratory", "institutional_laboratory"],
] as const;

const COUNT_KEYS: Record<
  InstitutionalGroupKind,
  keyof InstitutionalGroupCounts
> = {
  organization: "organizations",
  osu: "osus",
  laboratory: "laboratories",
};

const hasActiveManager = (
  eb: ExpressionBuilder<DB, "user">,
  kind: InstitutionalGroupKind,
  column: (typeof RECORDED_KINDS)[number][1],
) =>
  eb.exists(
    eb
      .selectFrom("user_managed_institutional_group as manager")
      .innerJoin("user as active", "active.id", "manager.user_id")
      .select("manager.code")
      .where("manager.kind", "=", kind)
      .whereRef("manager.code", "=", `user.${column}`)
      .where("active.status", "=", "accepted"),
  );

export function createInstitutionalGroupRepository(
  db: Kysely<DB>,
): InstitutionalGroupRepository {
  return {
    listManagers: ({ kind, code }) =>
      withTransaction(db, async (trx) => {
        const rows = await trx
          .selectFrom("user_managed_institutional_group")
          .innerJoin(
            "user",
            "user.id",
            "user_managed_institutional_group.user_id",
          )
          .select([
            "user.id",
            "user.email",
            "user.name",
            "user.firstname",
            "user.orcid",
            "user.status",
          ])
          .where("user_managed_institutional_group.kind", "=", kind)
          .where("user_managed_institutional_group.code", "=", code)
          .orderBy("user.email", "asc")
          .execute();
        return rows.map((row) => groupManagerSchema.parse(row));
      }),
    addManager: ({ kind, code }, userId) =>
      withTransaction(db, async (trx) => {
        const found = await trx
          .selectFrom("user")
          .select("status")
          .where("id", "=", userId)
          .executeTakeFirst();
        if (!found) {
          throw new HTTPException(404, { message: "User not found" });
        }
        if (!canJoinManualGroup(found.status)) {
          throw new HTTPException(422, { message: "User is not accepted" });
        }
        await trx
          .insertInto("user_managed_institutional_group")
          .values({ user_id: userId, kind, code })
          .onConflict((oc) => oc.doNothing())
          .execute();
      }),
    removeManager: ({ kind, code }, userId) =>
      withTransaction(db, async (trx) => {
        const { numDeletedRows } = await trx
          .deleteFrom("user_managed_institutional_group")
          .where("user_id", "=", userId)
          .where("kind", "=", kind)
          .where("code", "=", code)
          .executeTakeFirst();
        if (numDeletedRows === 0n) {
          throw new HTTPException(404, { message: "Manager not found" });
        }
      }),
    countActiveManagers: () =>
      withTransaction(db, async (trx) => {
        const rows = await trx
          .selectFrom("user_managed_institutional_group")
          .innerJoin(
            "user",
            "user.id",
            "user_managed_institutional_group.user_id",
          )
          .select((eb) => [
            "user_managed_institutional_group.kind",
            "user_managed_institutional_group.code",
            eb.fn.countAll<number>().as("count"),
          ])
          .where("user.status", "=", "accepted")
          .groupBy([
            "user_managed_institutional_group.kind",
            "user_managed_institutional_group.code",
          ])
          .execute();
        const counts: InstitutionalGroupCounts = {
          organizations: {},
          osus: {},
          laboratories: {},
        };
        for (const { kind, code, count } of rows) {
          counts[COUNT_KEYS[kind]][code] = Number(count);
        }
        return counts;
      }),
    listWithoutActiveManager: () =>
      withTransaction(db, async (trx) => {
        const perKind = await Promise.all(
          RECORDED_KINDS.map(async ([kind, column]) => {
            const rows = await trx
              .selectFrom("user")
              .select(`${column} as code`)
              .distinct()
              .where(column, "is not", null)
              .where((eb) => eb.not(hasActiveManager(eb, kind, column)))
              .orderBy(`${column} asc`)
              .execute();
            return rows.map(
              ({ code }): InstitutionalGroupRef => ({
                kind,
                code: code!,
              }),
            );
          }),
        );
        return perKind.flat();
      }),
  };
}
