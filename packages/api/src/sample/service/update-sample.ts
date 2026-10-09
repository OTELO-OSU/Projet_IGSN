import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { addSampleParents } from "./add-sample-parents.ts";
import { getSampleById } from "./get-sample-by-id.ts";
import { inheritParentCollectionDate } from "./inherit-parent-collection-date.ts";
import { markForSynchronization } from "./mark-for-synchronization.ts";
import {
  additionalRolesOf,
  replaceSampleAdditionalRoles,
} from "./replace-sample-additional-roles.ts";
import {
  ChildNotEligibleError,
  replaceSampleChildren,
} from "./replace-sample-children.ts";
import { replaceSampleManualGroups } from "./replace-sample-manual-groups.ts";
import { replaceSampleMineralClassifications } from "./replace-sample-mineral-classifications.ts";
import { replaceSampleProcessSteps } from "./replace-sample-process-steps.ts";
import { replaceSampleRelations } from "./replace-sample-relations.ts";
import { sampleColumns } from "./sample-columns.ts";
import { writeSampleLocation } from "./write-sample-location.ts";

export async function writeSample(
  db: Transactional<DB>,
  id: string,
  input: CreateSample,
): Promise<boolean> {
  if (isVirtualSample(input.type)) {
    const membership = await db
      .selectFrom("sample_series_membership")
      .select("series_id")
      .where("sample_id", "=", id)
      .executeTakeFirst();
    if (membership) throw new ChildNotEligibleError();
  }
  const row = await db
    .updateTable("sample")
    .set({
      ...sampleColumns(input),
      updated_at: sql`now()`,
      synchronization_status: sql`case when status = 'draft' then null else synchronization_status end`,
      synchronization_error: sql`case when status = 'draft' then null else synchronization_error end`,
    })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();
  if (!row) return false;
  if (!(await addSampleParents(db, id, input.parentIds))) {
    await writeSampleLocation(db, id, input.location);
  }
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
  await replaceSampleChildren(db, id, input.childIds ?? []);
  await markForSynchronization(db, [id]);
  return true;
}

export async function updateSample(
  db: Transactional<DB>,
  id: string,
  input: CreateSample,
): Promise<Sample | null> {
  return (await writeSample(db, id, input)) ? getSampleById(db, id) : null;
}
