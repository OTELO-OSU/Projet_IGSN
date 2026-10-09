import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function listDoiChildren(
  db: Transactional<DB>,
  sampleId: string,
): Promise<{ igsn: string }[]> {
  return db
    .selectFrom("sample_parent")
    .innerJoin("sample", "sample.id", "sample_parent.sample_id")
    .select("sample.igsn")
    .where("sample_parent.parent_id", "=", sampleId)
    .where("sample.igsn", "is not", null)
    .orderBy("sample.igsn")
    .$narrowType<{ igsn: string }>()
    .execute();
}
