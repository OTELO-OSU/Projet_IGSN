import type { AddContributorResult } from "@projet-igsn/domain/user-sample/repository";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export async function insertSampleContributor(
  db: Transactional<DB>,
  sampleId: string,
  userId: string,
): Promise<AddContributorResult> {
  const user = await db
    .selectFrom("user")
    .select(["email", "name", "firstname"])
    .where("id", "=", userId)
    .executeTakeFirst();
  if (!user) {
    return "unknown_user";
  }
  const inserted = await db
    .insertInto("user_sample")
    .values({ sample_id: sampleId, user_id: userId, role: "contributor" })
    .onConflict((oc) => oc.columns(["user_id", "sample_id"]).doNothing())
    .returning("user_id")
    .executeTakeFirst();
  return inserted ? { added: user } : "already_contributor";
}
