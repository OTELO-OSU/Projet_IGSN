import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";
import { inheritParentCollectionDate } from "./inherit-parent-collection-date.ts";
import {
  additionalRolesOf,
  replaceSampleAdditionalRoles,
} from "./replace-sample-additional-roles.ts";
import { replaceSampleManualGroups } from "./replace-sample-manual-groups.ts";
import { replaceSampleMineralClassifications } from "./replace-sample-mineral-classifications.ts";
import { replaceSampleProcessSteps } from "./replace-sample-process-steps.ts";
import { replaceSampleRelations } from "./replace-sample-relations.ts";
import { sampleColumns } from "./sample-columns.ts";
import { writeSampleLocation } from "./write-sample-location.ts";

export async function updateSample(
  db: Transactional<DB>,
  id: string,
  input: CreateSample,
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
  await replaceSampleMineralClassifications(
    db,
    id,
    input.mineralClassifications ?? [],
  );
  await replaceSampleAdditionalRoles(db, id, additionalRolesOf(input));
  if (input.manualGroupIds) {
    await replaceSampleManualGroups(db, id, input.manualGroupIds);
  }
  return getSampleById(db, id);
}
