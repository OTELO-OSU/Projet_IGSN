import type { MineralClassification } from "@projet-igsn/domain/sample/mineral/model";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function replaceSampleMineralClassifications(
  db: Transactional<DB>,
  sampleId: string,
  rows: MineralClassification[],
): Promise<void> {
  await db
    .deleteFrom("mineral_classification")
    .where("sample_id", "=", sampleId)
    .execute();
  if (rows.length === 0) return;
  await db
    .insertInto("mineral_classification")
    .values(
      rows.map(({ strunzId, mindatId, abundance }) => ({
        id: uuidv7(),
        sample_id: sampleId,
        strunz_id: strunzId,
        mindat_id: mindatId ?? null,
        abundance: abundance ?? null,
      })),
    )
    .execute();
}
