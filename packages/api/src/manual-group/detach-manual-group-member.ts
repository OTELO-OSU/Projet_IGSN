import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";
import { canDetachFromGroup } from "./can-detach-from-group.ts";

export type DetachResult = "detached" | "not_member" | "has_published_sample";

export async function detachManualGroupMember(
  trx: Transactional<DB>,
  groupId: string,
  userId: string,
): Promise<DetachResult> {
  const { numDeletedRows } = await trx
    .deleteFrom("manual_group_member")
    .where("group_id", "=", groupId)
    .where("user_id", "=", userId)
    .where(canDetachFromGroup(userId, groupId))
    .executeTakeFirst();
  if (numDeletedRows > 0n) {
    return "detached";
  }
  const member = await trx
    .selectFrom("manual_group_member")
    .select("group_id")
    .where("group_id", "=", groupId)
    .where("user_id", "=", userId)
    .executeTakeFirst();
  return member ? "has_published_sample" : "not_member";
}
