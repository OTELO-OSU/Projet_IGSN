import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function hasParent(
  db: Transactional<DB>,
  sampleId: string,
): Promise<boolean> {
  const parent = await db
    .selectFrom("sample_parent")
    .select("parent_id")
    .where("sample_id", "=", sampleId)
    .executeTakeFirst();
  return parent !== undefined;
}
