import type { SampleStatus } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function findSampleStatusByIgsn(
  db: Transactional<DB>,
  igsn: string,
): Promise<SampleStatus | null> {
  const row = await db
    .selectFrom("sample")
    .select("status")
    .where("igsn", "=", igsn)
    .executeTakeFirst();
  return row?.status ?? null;
}
