import type { ExpressionBuilder } from "kysely";

import { jsonArrayFrom } from "kysely/helpers/postgres";

import type { DB } from "../../db.ts";

// Kysely's reference types are per-table, so the two are spelled out rather than
// parameterized.
export function sampleLinks(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_link")
      .selectAll("sample_link")
      .whereRef("sample_link.sample_id", "=", "sample.id")
      .orderBy("sample_link.id"),
  ).as("links");
}

export function sampleAttachments(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_attachment")
      .selectAll("sample_attachment")
      .whereRef("sample_attachment.sample_id", "=", "sample.id")
      .orderBy("sample_attachment.id"),
  ).as("attachments");
}
