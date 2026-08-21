import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { Transaction } from "kysely";

import { canJoinManualGroup } from "@projet-igsn/domain/manual-group/can-join-manual-group";
import { canManageManualGroup } from "@projet-igsn/domain/user/can-manage-manual-group";
import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

import { detachManualGroupMember } from "../manual-group/detach-manual-group-member.ts";
import { assertManualGroupsExist } from "../manual-group/manual-groups-by-ids.ts";

const permittedGroupIds = (
  submitted: string[],
  current: Set<string>,
  scope: ModerationScope,
) => {
  const manages = (id: string) => canManageManualGroup(scope, id);
  return new Set([
    ...[...current].filter((id) => !manages(id)),
    ...submitted.filter(manages),
  ]);
};

export async function upsertUserManualGroups(
  trx: Transaction<DB>,
  userId: string,
  groupIds: string[],
  status: UserStatus,
  scope: ModerationScope,
): Promise<{ joined: ManualGroup[]; leftIds: string[] }> {
  const current = new Set(
    (
      await trx
        .selectFrom("manual_group_member")
        .select("group_id")
        .where("user_id", "=", userId)
        .execute()
    ).map((row) => row.group_id),
  );
  const wanted = permittedGroupIds(groupIds, current, scope);
  const joinedIds = [...wanted].filter((groupId) => !current.has(groupId));
  const leftIds = [...current].filter((groupId) => !wanted.has(groupId));

  const joined = await assertManualGroupsExist(trx, joinedIds);
  if (joined.length > 0 && !canJoinManualGroup(status)) {
    throw new HTTPException(422, { message: "User is not accepted" });
  }

  for (const groupId of leftIds) {
    const detached = await detachManualGroupMember(trx, groupId, userId);
    if (detached === "has_published_sample") {
      throw new HTTPException(409, { message: "has_published_sample" });
    }
  }
  if (joinedIds.length) {
    await trx
      .insertInto("manual_group_member")
      .values(
        joinedIds.map((groupId) => ({ group_id: groupId, user_id: userId })),
      )
      .execute();
  }
  return { joined, leftIds };
}
