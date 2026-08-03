import type { ExpressionBuilder } from "kysely";

import { jsonArrayFrom } from "kysely/helpers/postgres";

import type { DB } from "../../db.ts";

export function sampleAttachments(eb: ExpressionBuilder<DB, "sample">) {
  return jsonArrayFrom(
    eb
      .selectFrom("sample_attachment")
      .selectAll("sample_attachment")
      .whereRef("sample_attachment.sample_id", "=", "sample.id")
      .orderBy("sample_attachment.id"),
  ).as("attachments");
}
