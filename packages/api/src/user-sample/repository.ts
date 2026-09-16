import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { Kysely, Transaction } from "kysely";

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
  const tx =
    <A extends unknown[], R>(
      fn: (trx: Transaction<DB>, ...args: A) => Promise<R>,
    ) =>
    (...args: A) =>
      withTransaction(db, (trx) => fn(trx, ...args));
  return {
    addOwner: tx(insertSampleOwner),
    addCollaborator: tx(insertSampleCollaborator),
    removeCollaborator: tx(deleteSampleCollaborator),
    listCollaborators: tx(listSampleCollaborators),
    listContactRecipients: tx(listContactRecipients),
  };
}
