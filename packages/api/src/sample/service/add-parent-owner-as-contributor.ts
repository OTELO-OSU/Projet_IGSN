import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function addParentOwnerAsContributor(
  db: Transactional<DB>,
  sampleId: string,
  parentIds: string[],
): Promise<void> {
  if (parentIds.length === 0) return;
  await db
    .insertInto("user_sample")
    .columns(["sample_id", "user_id", "role"])
    .expression((eb) =>
      eb
        .selectFrom("user_sample")
        .select((inner) => [
          inner.val(sampleId).as("sample_id"),
          "user_sample.user_id",
          inner.val("contributor").as("role"),
        ])
        .where("user_sample.sample_id", "in", parentIds)
        .where("user_sample.role", "=", "owner"),
    )
    .onConflict((oc) => oc.constraint("user_sample_pkey").doNothing())
    .execute();
}
