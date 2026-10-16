import type { ListManualGroupsQuery } from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { ExpressionBuilder, Transaction } from "kysely";

import { manualGroupListItemSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";

import type { DB } from "../db.ts";

import { likePattern } from "../like-pattern.ts";
import { GROUP_COLUMNS, hasActiveManager } from "./manual-group-columns.ts";

const activeManagerCount = (eb: ExpressionBuilder<DB, "manual_group">) =>
  eb
    .selectFrom("user_managed_manual_group")
    .innerJoin("user", "user.id", "user_managed_manual_group.user_id")
    .whereRef("user_managed_manual_group.group_id", "=", "manual_group.id")
    .where("user.status", "=", "accepted")
    .select((count) => count.fn.countAll().as("count"));

export async function listManualGroups(
  trx: Transaction<DB>,
  { page, perPage, search, noManager }: ListManualGroupsQuery,
  managedGroupIds: string[] | null,
): ReturnType<ManualGroupRepository["list"]> {
  const matching = trx
    .selectFrom("manual_group")
    .$if(managedGroupIds !== null, (qb) =>
      managedGroupIds!.length > 0
        ? qb.where("id", "in", managedGroupIds!)
        : qb.where((eb) => eb.lit(false)),
    )
    .$if(Boolean(search), (qb) =>
      qb.where("name", "ilike", likePattern(search!)),
    )
    .$if(noManager === true, (qb) =>
      qb.where((eb) => eb.not(hasActiveManager(eb))),
    );
  const rows = await matching
    .select((eb) => [
      ...GROUP_COLUMNS,
      eb
        .selectFrom("manual_group_member")
        .whereRef("manual_group_member.group_id", "=", "manual_group.id")
        .select((count) => count.fn.countAll().as("count"))
        .as("memberCount"),
      activeManagerCount(eb).as("managerCount"),
    ])
    .orderBy("name", "asc")
    .limit(perPage)
    .offset((page - 1) * perPage)
    .execute();
  const { count } = await matching
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow();
  return {
    data: rows.map((row) =>
      manualGroupListItemSchema.parse({
        ...row,
        memberCount: Number(row.memberCount),
        managerCount: Number(row.managerCount),
      }),
    ),
    total: Number(count),
  };
}
