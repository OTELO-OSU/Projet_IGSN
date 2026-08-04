import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { sampleAttachments } from "./sample-attachments.ts";
import { sampleLinks } from "./sample-links.ts";
import { toSample } from "./to-sample.ts";

export async function getSampleById(
  db: Transactional<DB>,
  id: string,
): Promise<Sample> {
  const row = await db
    .selectFrom("sample")
    .selectAll()
    .select(sampleLinks)
    .select(sampleAttachments)
    .where("id", "=", id)
    .executeTakeFirstOrThrow();
  return toSample(row, row.links, row.attachments);
}
