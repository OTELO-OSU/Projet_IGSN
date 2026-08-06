import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";
import { collaboratableUsers } from "../user/collaboratable-users.ts";

export async function insertSampleContributor(
  db: Transactional<DB>,
  sampleId: string,
  userId: string,
): Promise<"added" | "unknown_user"> {
  const user = await collaboratableUsers(db)
    .select("id")
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) {
    return "unknown_user";
  }
  await db
    .insertInto("user_sample")
    .values({ sample_id: sampleId, user_id: userId, role: "contributor" })
    .onConflict((oc) => oc.columns(["user_id", "sample_id"]).doNothing())
    .execute();
  return "added";
}
