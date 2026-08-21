import type { Expression } from "kysely";

import { expressionBuilder } from "kysely";

import type { DB } from "../db.ts";

export function ownsPublishedSampleInGroup(
  userId: string,
  groupId: string | Expression<string>,
) {
  const eb = expressionBuilder<DB, "manual_group">();
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
