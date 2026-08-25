import type { ExpressionBuilder } from "kysely";

import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

import type { DB } from "../../db.ts";

export function sampleLinksQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_link")
      .selectAll("sample_link")
      .whereRef("sample_link.sample_id", "=", "sample.id")
      .orderBy("sample_link.id"),
  ).as("links");
}

export function sampleManualGroupsQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_manual_group")
      .innerJoin(
        "manual_group",
        "manual_group.id",
        "sample_manual_group.group_id",
      )
      .select(["manual_group.id", "manual_group.name"])
      .whereRef("sample_manual_group.sample_id", "=", "sample.id")
      .orderBy("manual_group.name"),
  ).as("manualGroups");
}

export function sampleOwnerQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonObjectFrom(
    eb
      .selectFrom("user_sample")
      .innerJoin("user", "user.id", "user_sample.user_id")
      .select(["user.name", "user.firstname", "user.status"])
      .whereRef("user_sample.sample_id", "=", "sample.id")
      .where("user_sample.role", "=", "owner")
      .limit(1),
  ).as("owner");
}

export function sampleAttachmentsQuery(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_attachment")
      .selectAll("sample_attachment")
      .whereRef("sample_attachment.sample_id", "=", "sample.id")
      .orderBy("sample_attachment.id"),
  ).as("attachments");
}
