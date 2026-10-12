import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { markForSynchronization } from "./mark-for-synchronization.ts";

export async function setSampleSeries(
  db: Transactional<DB>,
  sampleId: string,
  seriesId: string | null,
): Promise<void> {
  const left = await db
    .deleteFrom("sample_series_membership")
    .where("sample_id", "=", sampleId)
    .returning("series_id")
    .executeTakeFirst();
  const leftSeriesId = left?.series_id ?? null;
  if (seriesId !== null) {
    await db
      .insertInto("sample_series_membership")
      .values({ sample_id: sampleId, series_id: seriesId })
      .execute();
  }
  if (leftSeriesId === seriesId) return;
  await markForSynchronization(
    db,
    [leftSeriesId, seriesId].filter((id) => id !== null),
  );
}
