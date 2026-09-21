import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";

import type { DataCiteConfig } from "../../datacite/config.ts";
import type { DB } from "../../db.ts";

import { syncDoi } from "../../datacite/sync-doi.ts";
import { type Transactional } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";

export async function setSampleStatus(
  db: Transactional<DB>,
  id: string,
  status: SetSampleStatusBody["status"],
  config: DataCiteConfig | null = null,
): Promise<Sample | null> {
  const row = await db
    .updateTable("sample")
    .set({ status })
    .where("id", "=", id)
    .returning("id")
    .executeTakeFirst();
  if (!row) return null;
  const sample = await getSampleById(db, id);
  await syncDoi(config, sample);
  return sample;
}
