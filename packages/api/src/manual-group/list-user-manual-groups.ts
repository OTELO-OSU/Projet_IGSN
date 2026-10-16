import type { MyManualGroup } from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { Transaction } from "kysely";

import { myManualGroupSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";

import type { DB } from "../db.ts";

import { canDetachFromGroup } from "./can-detach-from-group.ts";

export async function listUserManualGroups(
  trx: Transaction<DB>,
  userId: string,
): Promise<MyManualGroup[]> {
  const rows = await trx
    .selectFrom("manual_group")
    .innerJoin(
      "manual_group_member",
      "manual_group_member.group_id",
      "manual_group.id",
    )
    .select((eb) => [
      "manual_group.id",
      "manual_group.name",
      canDetachFromGroup(userId, eb.ref("manual_group.id")).as("canLeave"),
    ])
    .where("manual_group_member.user_id", "=", userId)
    .orderBy("manual_group.name", "asc")
    .execute();
  return rows.map((row) => myManualGroupSchema.parse(row));
}
