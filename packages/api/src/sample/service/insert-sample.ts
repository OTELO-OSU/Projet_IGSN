import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { soleParent } from "@projet-igsn/domain/sample/parent/sole-parent";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";
import { inheritParentCollectionDate } from "./inherit-parent-collection-date.ts";
import { inheritParentLocation } from "./inherit-parent-location.ts";
import { insertSampleParents } from "./insert-sample-parents.ts";
import { replaceSampleManualGroups } from "./replace-sample-manual-groups.ts";
import { replaceSampleProcessSteps } from "./replace-sample-process-steps.ts";
import { replaceSampleRelations } from "./replace-sample-relations.ts";
import { sampleColumns } from "./sample-columns.ts";
import { writeSampleLocation } from "./write-sample-location.ts";

export async function insertSample(
  db: Transactional<DB>,
  input: CreateSample,
  groups?: InstitutionalGroups,
): Promise<Sample> {
  return getSampleById(db, await insertSampleRows(db, input, groups));
}

export async function insertSampleRows(
  db: Transactional<DB>,
  input: CreateSample,
  groups?: InstitutionalGroups,
): Promise<string> {
  const row = await db
    .insertInto("sample")
    .values({
      id: uuidv7(),
      ...sampleColumns(input),
      institutional_organization: groups?.institutionalOrganization ?? null,
      institutional_osu: groups?.institutionalOsu ?? null,
      institutional_laboratory: groups?.institutionalLaboratory ?? null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  const parentIds = input.parentIds ?? [];
  await insertSampleParents(db, row.id, parentIds);
  await inheritParentCollectionDate(db, row.id);
  const locationParent = soleParent(parentIds);
  if (locationParent === undefined) {
    await writeSampleLocation(db, row.id, input.location);
  } else {
    await inheritParentLocation(db, row.id, locationParent);
  }
  await replaceSampleRelations(db, row.id, input.relations ?? []);
  await replaceSampleProcessSteps(db, row.id, input.processSteps ?? []);
  await replaceSampleManualGroups(db, row.id, input.manualGroupIds ?? []);
  return row.id;
}
