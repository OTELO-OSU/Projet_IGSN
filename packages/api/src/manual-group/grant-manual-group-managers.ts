import { canJoinManualGroup } from "@projet-igsn/domain/manual-group/can-join-manual-group";
import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export async function grantManualGroupManagers(
  trx: Transactional<DB>,
  groupId: string,
  userIds: string[],
): Promise<void> {
  const wanted = [...new Set(userIds)];
  if (wanted.length === 0) return;

  const managers = await trx
    .selectFrom("user")
    .select(["id", "status"])
    .where("id", "in", wanted)
    .execute();
  if (managers.length !== wanted.length) {
    throw new HTTPException(404, { message: "User not found" });
  }
  if (managers.some(({ status }) => !canJoinManualGroup(status))) {
    throw new HTTPException(422, { message: "User is not accepted" });
  }

  await trx
    .insertInto("user_managed_manual_group")
    .values(wanted.map((userId) => ({ user_id: userId, group_id: groupId })))
    .execute();
}
