import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function setSampleSeries(
  db: Transactional<DB>,
  sampleId: string,
  seriesId: string | null,
): Promise<void> {
  await db
    .deleteFrom("sample_series_membership")
    .where("sample_id", "=", sampleId)
    .execute();
  if (seriesId === null) return;
  await db
    .insertInto("sample_series_membership")
    .values({ sample_id: sampleId, series_id: seriesId })
    .execute();
}
