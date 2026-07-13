import type { Selectable } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

// The sample's 0:1 age row, or undefined when it has none.
export async function getSampleAge(
  db: Transactional<DB>,
  sampleId: string,
): Promise<Selectable<DB["sample_age"]> | undefined> {
  return db
    .selectFrom("sample_age")
    .selectAll()
    .where("sample_id", "=", sampleId)
    .executeTakeFirst();
}
