import type { AddManualGroupMemberResult } from "@projet-igsn/domain/manual-group/repository";

import { canJoinManualGroup } from "@projet-igsn/domain/manual-group/can-join-manual-group";
import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export async function addManualGroupMember(
  db: Transactional<DB>,
  groupId: string,
  userId: string,
): Promise<AddManualGroupMemberResult> {
  const found = await db
    .selectFrom("user")
    .leftJoin("manual_group_member", (join) =>
      join
        .onRef("manual_group_member.user_id", "=", "user.id")
        .on("manual_group_member.group_id", "=", groupId),
    )
    .select([
      "user.email",
      "user.name",
      "user.firstname",
      "user.status",
      "manual_group_member.group_id as memberOf",
    ])
    .where("user.id", "=", userId)
    .executeTakeFirst();
  if (!found) {
    throw new HTTPException(404, { message: "User not found" });
  }
  const { memberOf, status, ...user } = found;
  if (memberOf) {
    return "already_member";
  }
  if (!canJoinManualGroup(status)) {
    throw new HTTPException(422, { message: "User is not accepted" });
  }
  await db
    .insertInto("manual_group_member")
    .values({ group_id: groupId, user_id: userId })
    .onConflict((oc) => oc.doNothing())
    .execute();
  return { added: user };
}
