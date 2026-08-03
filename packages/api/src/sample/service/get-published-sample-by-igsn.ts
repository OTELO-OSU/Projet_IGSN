import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { sampleAttachments } from "./sample-attachments.ts";
import { sampleLinks } from "./sample-links.ts";
import { toSample } from "./to-sample.ts";

export async function getPublishedSampleByIgsn(
  db: Transactional<DB>,
  igsn: string,
): Promise<Sample | null> {
  const row = await db
    .selectFrom("sample")
    .selectAll()
    .select(sampleLinks)
    .select(sampleAttachments)
    .where("igsn", "=", igsn)
    .where("published", "=", true)
    .executeTakeFirst();
  if (!row) return null;
  return toSample(row, row.links, row.attachments);
}
