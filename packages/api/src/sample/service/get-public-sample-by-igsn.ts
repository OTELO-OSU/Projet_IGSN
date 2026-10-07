import type { Sample } from "@projet-igsn/domain/sample/sample";

import { PUBLIC_SAMPLE_STATUSES } from "@projet-igsn/domain/sample/publication/public-sample-statuses";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { selectSample } from "./select-sample.ts";
import { toSample } from "./to-sample.ts";

export async function getPublicSampleByIgsn(
  db: Transactional<DB>,
  igsn: string,
): Promise<Sample | null> {
  const row = await selectSample(db)
    .where("igsn", "=", igsn)
    .where("status", "in", PUBLIC_SAMPLE_STATUSES)
    .executeTakeFirst();
  if (!row) return null;
  return toSample(row);
}
