import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleAge } from "./get-sample-age.ts";
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
  const [location, age] = await Promise.all([
    readLocation(db, row.id),
    getSampleAge(db, row.id),
  ]);
  return toSample(row, location, age);
}
