import type { GroupManager } from "@projet-igsn/domain/user/user-validator";
import type { Transaction } from "kysely";

import { groupManagerSchema } from "@projet-igsn/domain/user/user-validator";
import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

export async function listManualGroupManagers(
  trx: Transaction<DB>,
  id: string,
): Promise<GroupManager[]> {
  const rows = await trx
    .selectFrom("user_managed_manual_group")
    .innerJoin("user", "user.id", "user_managed_manual_group.user_id")
    .select([
      "user.id",
      "user.email",
      "user.name",
      "user.firstname",
      "user.orcid",
      "user.status",
    ])
    .where("user_managed_manual_group.group_id", "=", id)
    .orderBy("user.email", "asc")
    .execute();
  return rows.map((row) => groupManagerSchema.parse(row));
}

export async function revokeManualGroupManager(
  trx: Transaction<DB>,
  groupId: string,
  userId: string,
): Promise<void> {
  const { numDeletedRows } = await trx
    .deleteFrom("user_managed_manual_group")
    .where("group_id", "=", groupId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (numDeletedRows === 0n) {
    throw new HTTPException(404, { message: "Manager not found" });
  }
}
