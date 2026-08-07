import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function releaseEditLock(
  db: Transactional<DB>,
  id: string,
  userId: string,
): Promise<void> {
  await db
    .deleteFrom("sample_edit_lock")
    .where("sample_id", "=", id)
    .where("user_id", "=", userId)
    .execute();
}
