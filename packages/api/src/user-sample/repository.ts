import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";
import { deleteSampleCollaborator } from "./delete-sample-collaborator.ts";
import { insertSampleCollaborator } from "./insert-sample-collaborator.ts";
import { insertSampleOwner } from "./insert-sample-owner.ts";
import { listContactRecipients } from "./list-contact-recipients.ts";
import { listSampleCollaborators } from "./list-sample-collaborators.ts";

export function createUserSampleRepository(
  db: Kysely<DB>,
): UserSampleRepository {
  return {
    addOwner: (sampleId, userId) =>
      withTransaction(db, (trx) => insertSampleOwner(trx, sampleId, userId)),
    addCollaborator: (sampleId, userId, role, options) =>
      withTransaction(db, (trx) =>
        insertSampleCollaborator(trx, sampleId, userId, role, options),
      ),
    removeCollaborator: (sampleId, userId) =>
      withTransaction(db, (trx) =>
        deleteSampleCollaborator(trx, sampleId, userId),
      ),
    listCollaborators: (sampleId) =>
      withTransaction(db, (trx) => listSampleCollaborators(trx, sampleId)),
    listContactRecipients: (sample) =>
      withTransaction(db, (trx) => listContactRecipients(trx, sample)),
  };
}
