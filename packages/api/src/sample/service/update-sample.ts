import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";
import { replaceSampleManualGroups } from "./replace-sample-manual-groups.ts";
import { replaceSampleRelations } from "./replace-sample-relations.ts";
import { sampleColumns } from "./sample-columns.ts";

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
  await replaceSampleRelations(db, id, input.relations ?? []);
  if (input.manualGroupIds) {
    await replaceSampleManualGroups(db, id, input.manualGroupIds);
  }
  return getSampleById(db, id);
}
