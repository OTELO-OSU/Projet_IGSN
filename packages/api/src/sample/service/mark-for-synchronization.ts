import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function markForSynchronization(
  db: Transactional<DB>,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  await db
    .updateTable("sample")
    .set({ synchronization_status: "pending" })
    .where("id", "in", ids)
    .where("status", "<>", "draft")
    .execute();
}
