import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function replaceSampleManualGroups(
  db: Transactional<DB>,
  sampleId: string,
  groupIds: string[],
): Promise<void> {
  await db
    .deleteFrom("sample_manual_group")
    .where("sample_id", "=", sampleId)
    .execute();
  if (groupIds.length === 0) return;
  await db
    .insertInto("sample_manual_group")
    .values(
      [...new Set(groupIds)].map((groupId) => ({
        sample_id: sampleId,
        group_id: groupId,
      })),
    )
    .execute();
}
