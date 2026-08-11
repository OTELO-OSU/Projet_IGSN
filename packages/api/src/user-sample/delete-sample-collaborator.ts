import type { DB } from "../db.ts";

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
  return result.numDeletedRows > 0n ? "removed" : "not_found";
}
