import type { Expression } from "kysely";

import { expressionBuilder } from "kysely";

import type { DB } from "../db.ts";

function ownsPublishedSampleInGroup(
  userId: string | Expression<string>,
  groupId: string | Expression<string>,
) {
  const eb = expressionBuilder<DB, never>();
  return eb.exists(
    eb
      .selectFrom("sample_manual_group")
      .innerJoin("sample", "sample.id", "sample_manual_group.sample_id")
      .innerJoin(
        "user_sample",
        "user_sample.sample_id",
        "sample_manual_group.sample_id",
      )
      .select("sample.id")
      .where("sample_manual_group.group_id", "=", groupId)
      .where("sample.published", "=", true)
      .where("user_sample.user_id", "=", userId)
      .where("user_sample.role", "=", "owner"),
  );
}

export function canDetachFromGroup(
  userId: string | Expression<string>,
  groupId: string | Expression<string>,
) {
  return expressionBuilder<DB, never>().not(
    ownsPublishedSampleInGroup(userId, groupId),
  );
}
