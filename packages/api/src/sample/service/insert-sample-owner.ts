import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

// Assigns a sample to its owner. No role column yet: the row is the ownership.
export async function insertSampleOwner(
  db: Transactional<DB>,
  sampleId: string,
  userId: string,
): Promise<void> {
  await db
    .insertInto("user_sample")
    .values({ sample_id: sampleId, user_id: userId })
    .execute();
}
