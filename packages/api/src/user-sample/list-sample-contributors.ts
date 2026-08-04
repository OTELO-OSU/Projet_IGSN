import type { User } from "@projet-igsn/domain/user/model";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export function listSampleContributors(
  db: Transactional<DB>,
  sampleId: string,
): Promise<User[]> {
  return db
    .selectFrom("user_sample")
    .innerJoin("user", "user.id", "user_sample.user_id")
    .select(["user.id", "user.email", "user.name", "user.firstname"])
    .where("user_sample.sample_id", "=", sampleId)
    .where("user_sample.role", "=", "contributor")
    .orderBy("user.name")
    .execute();
}
