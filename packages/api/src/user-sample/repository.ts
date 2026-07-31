import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";
import { insertSampleContributor } from "./insert-sample-contributor.ts";
import { insertSampleOwner } from "./insert-sample-owner.ts";
import { listSampleContributors } from "./list-sample-contributors.ts";

export function createUserSampleRepository(
  db: Kysely<DB>,
): UserSampleRepository {
  return {
    addOwner: (sampleId, userId) =>
      withTransaction(db, (trx) => insertSampleOwner(trx, sampleId, userId)),
    addContributor: (sampleId, userId) =>
      withTransaction(db, (trx) =>
        insertSampleContributor(trx, sampleId, userId),
      ),
    listContributors: (sampleId) =>
      withTransaction(db, (trx) => listSampleContributors(trx, sampleId)),
  };
}
