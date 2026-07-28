import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";
import { insertSampleOwner } from "./insert-sample-owner.ts";

export function createUserSampleRepository(
  db: Kysely<DB>,
): UserSampleRepository {
  return {
    addOwner: (sampleId, userId) =>
      withTransaction(db, (trx) => insertSampleOwner(trx, sampleId, userId)),
  };
}
