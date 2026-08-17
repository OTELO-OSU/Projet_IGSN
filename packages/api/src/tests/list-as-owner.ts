import type { ListSamplesResult } from "@projet-igsn/domain/sample/repository";
import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import type { DB } from "../db.ts";

import { listSamplesAssignedTo } from "../sample/service/list-sample.ts";
import { type Transactional } from "../transaction.ts";
import { insertUser } from "./insert-user.ts";

export async function listAsOwner(
  db: Transactional<DB>,
  params: ListSamplesQuery,
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
  return listSamplesAssignedTo(db, params, owner.id);
}
