import type { DB } from "../db.ts";

import { releaseEditLock } from "../sample/service/release-edit-lock.ts";
import { type Transactional } from "../transaction.ts";

export async function deleteSampleCollaborator(
  db: Transactional<DB>,
  sampleId: string,
  userId: string,
): Promise<"removed" | "not_found"> {
  const result = await db
    .deleteFrom("user_sample")
    .where("sample_id", "=", sampleId)
    .where("user_id", "=", userId)
    .where("role", "!=", "owner")
    .executeTakeFirst();
  if (result.numDeletedRows === 0n) return "not_found";
  await releaseEditLock(db, sampleId, userId);
  return "removed";
}
