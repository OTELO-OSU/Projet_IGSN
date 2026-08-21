import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { Transaction } from "kysely";

import { canJoinManualGroup } from "@projet-igsn/domain/manual-group/can-join-manual-group";
import { HTTPException } from "hono/http-exception";

import type { DB } from "../db.ts";

export async function upsertUserManualGroups(
  trx: Transaction<DB>,
  userId: string,
  groupIds: string[],
  status: UserStatus,
  mayEdit: boolean,
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
  const wanted = mayEdit ? new Set(groupIds) : current;
  const joinedIds = [...wanted].filter((groupId) => !current.has(groupId));
  const leftIds = [...current].filter((groupId) => !wanted.has(groupId));

  const joined = joinedIds.length
    ? await trx
        .selectFrom("manual_group")
        .select(["id", "name"])
        .where("id", "in", joinedIds)
        .execute()
    : [];
  if (joined.length !== joinedIds.length) {
    throw new HTTPException(404, { message: "Manual group not found" });
  }
  if (joined.length > 0 && !canJoinManualGroup(status)) {
    throw new HTTPException(422, { message: "User is not accepted" });
  }

  if (leftIds.length) {
    await trx
      .deleteFrom("manual_group_member")
      .where("user_id", "=", userId)
      .where("group_id", "in", leftIds)
      .execute();
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
