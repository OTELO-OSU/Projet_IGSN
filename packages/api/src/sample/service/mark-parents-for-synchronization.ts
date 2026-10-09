import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function markParentsForSynchronization(
  db: Transactional<DB>,
  childIds: readonly string[],
): Promise<void> {
  if (childIds.length === 0) return;
  await db
    .updateTable("sample")
    .set({ synchronization_status: "pending" })
    .where("id", "in", (eb) =>
      eb
        .selectFrom("sample_parent")
        .select("parent_id")
        .where("sample_id", "in", childIds),
    )
    .where("status", "<>", "draft")
    .execute();
}
