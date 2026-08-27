import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";

export async function setSampleStatus(
  db: Transactional<DB>,
  id: string,
  status: SetSampleStatusBody["status"],
): Promise<Sample | null> {
  const row = await db
    .updateTable("sample")
    .set({ status })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();
  if (!row) return null;
  return getSampleById(db, id);
}
