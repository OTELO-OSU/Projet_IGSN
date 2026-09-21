import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { sql } from "kysely";

import type { DataCiteConfig } from "../../datacite/config.ts";
import type { DB } from "../../db.ts";

import { syncDoi } from "../../datacite/sync-doi.ts";
import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";
import { inheritParentCollectionDate } from "./inherit-parent-collection-date.ts";
import { replaceSampleManualGroups } from "./replace-sample-manual-groups.ts";
import { replaceSampleProcessSteps } from "./replace-sample-process-steps.ts";
import { replaceSampleRelations } from "./replace-sample-relations.ts";
import { sampleColumns } from "./sample-columns.ts";
import { writeSampleLocation } from "./write-sample-location.ts";

export async function updateSample(
  db: Transactional<DB>,
  id: string,
  input: CreateSample,
  config: DataCiteConfig | null = null,
): Promise<Sample | null> {
  const row = await db
    .updateTable("sample")
    .set({ ...sampleColumns(input), updated_at: sql`now()` })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();
  if (!row) return null;
  await writeSampleLocation(db, id, input.location);
  await inheritParentCollectionDate(db, id);
  await replaceSampleRelations(db, id, input.relations ?? []);
  await replaceSampleProcessSteps(db, id, input.processSteps ?? []);
  if (input.manualGroupIds) {
    await replaceSampleManualGroups(db, id, input.manualGroupIds);
  }
  const sample = await getSampleById(db, id);
  await syncDoi(config, sample);
  return sample;
}
