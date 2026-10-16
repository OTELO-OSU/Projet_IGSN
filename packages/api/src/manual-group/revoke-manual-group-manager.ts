import type { Transaction } from "kysely";

import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

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
