import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { readLocation } from "./read-location.ts";
import { toSample } from "./to-sample.ts";

export async function getPublishedSampleByIgsn(
  db: Transactional<DB>,
  igsn: string,
): Promise<Sample | null> {
  const row = await db
    .selectFrom("sample")
    .selectAll()
    .where("igsn", "=", igsn)
    .where("published", "=", true)
    .executeTakeFirst();
  if (!row) return null;
  return toSample(row, await readLocation(db, row.id));
}
