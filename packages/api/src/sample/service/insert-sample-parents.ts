import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function insertSampleParents(
  db: Transactional<DB>,
  sampleId: string,
  parentIds: string[],
): Promise<void> {
  if (parentIds.length === 0) return;
  await db
    .insertInto("sample_parent")
    .values(
      parentIds.map((parentId) => ({
        sample_id: sampleId,
        parent_id: parentId,
      })),
    )
    .execute();
}
