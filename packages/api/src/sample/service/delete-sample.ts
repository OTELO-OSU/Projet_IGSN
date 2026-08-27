import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function deleteSample(
  db: Transactional<DB>,
  id: string,
): Promise<void> {
  await db.deleteFrom("sample").where("id", "=", id).execute();
}
