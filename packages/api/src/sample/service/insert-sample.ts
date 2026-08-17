import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";
import { replaceSampleLinks } from "./replace-sample-links.ts";
import { sampleColumns } from "./sample-columns.ts";

export async function insertSample(
  db: Transactional<DB>,
  input: CreateSample,
  groups?: InstitutionalGroups,
): Promise<Sample> {
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
  await replaceSampleLinks(db, row.id, input.links ?? []);
  return getSampleById(db, row.id);
}
