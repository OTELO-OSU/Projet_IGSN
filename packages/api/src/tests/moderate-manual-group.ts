import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export function moderateManualGroup(
  db: Transactional<DB>,
  userId: string,
  groupIds: string[],
): Promise<unknown> {
  return db
    .insertInto("user_managed_manual_group")
    .values(groupIds.map((group_id) => ({ user_id: userId, group_id })))
    .execute();
}
