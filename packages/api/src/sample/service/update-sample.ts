import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";
import { replaceSampleLinks } from "./replace-sample-links.ts";
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
  // PUT semantics, like every other field: absent links clear the links.
  await replaceSampleLinks(db, id, input.links ?? []);
  return getSampleById(db, id);
}
