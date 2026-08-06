import type { SampleCollaborator } from "@projet-igsn/domain/user-sample/user-sample-validator";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export function listSampleCollaborators(
  db: Transactional<DB>,
  sampleId: string,
): Promise<SampleCollaborator[]> {
  return db
    .selectFrom("user_sample")
    .innerJoin("user", "user.id", "user_sample.user_id")
    .select([
      "user.id",
      "user.email",
      "user.name",
      "user.firstname",
      "user.orcid",
      "user_sample.role",
    ])
    .where("user_sample.sample_id", "=", sampleId)
    .orderBy("user.name")
    .execute();
}
