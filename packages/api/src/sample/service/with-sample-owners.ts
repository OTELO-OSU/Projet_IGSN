import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { AdminSampleListItem } from "@projet-igsn/domain/sample/sample-validator";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function withSampleOwners(
  db: Transactional<DB>,
  samples: Sample[],
): Promise<AdminSampleListItem[]> {
  if (samples.length === 0) {
    return [];
  }
  const owners = await db
    .selectFrom("user_sample")
    .innerJoin("user", "user.id", "user_sample.user_id")
    .select(["user_sample.sample_id", "user.name", "user.firstname"])
    .where("user_sample.role", "=", "owner")
    .where(
      "user_sample.sample_id",
      "in",
      samples.map((sample) => sample.id),
    )
    .execute();
  const ownerBySampleId = new Map(
    owners.map(({ sample_id, name, firstname }) => [
      sample_id,
      { name, firstname },
    ]),
  );
  return samples.map((sample) => ({
    ...sample,
    owner: ownerBySampleId.get(sample.id) ?? { name: null, firstname: null },
  }));
}
