import type {
  ListSamplesParams,
  ListSamplesResult,
} from "@projet-igsn/domain/sample/repository";

import type { DB } from "../db.ts";

import { listSamplesByOwner } from "../sample/service/list-sample.ts";
import { type Transactional } from "../transaction.ts";
import { insertUser } from "./insert-user.ts";

// Lists every sample in the table by claiming it for a fresh owner first. The
// only list exports are the scoped ones (no route may list unscoped), so specs
// covering the query logic every scope shares (sorting, facets, pagination) go
// through the owner scope rather than getting an unscoped variant to leak.
export async function listAsOwner(
  db: Transactional<DB>,
  params: ListSamplesParams,
): Promise<ListSamplesResult> {
  const owner = await insertUser(db, `${crypto.randomUUID()}@univ-lorraine.fr`);
  const samples = await db.selectFrom("sample").select("id").execute();
  if (samples.length > 0) {
    const sampleIds = samples.map((sample) => sample.id);
    await db
      .deleteFrom("user_sample")
      .where("sample_id", "in", sampleIds)
      .execute();
    await db
      .insertInto("user_sample")
      .values(
        sampleIds.map((sampleId) => ({
          user_id: owner.id,
          sample_id: sampleId,
          role: "owner" as const,
        })),
      )
      .execute();
  }
  return listSamplesByOwner(db, params, owner.id);
}
