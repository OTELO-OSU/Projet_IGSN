import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { getPublishedSampleByIgsn } from "./service/get-published-sample-by-igsn.ts";
import { getSample } from "./service/get-sample.ts";
import { insertSample } from "./service/insert-sample.ts";
import {
  listPublishedSamples,
  listSamplesAssignedTo,
} from "./service/list-sample.ts";
import { publishSample } from "./service/publish-sample.ts";
import { updateSample } from "./service/update-sample.ts";

export function createSampleRepository(db: Kysely<DB>): SampleRepository {
  return {
    list: (params, userId) =>
      withTransaction(db, (trx) => listSamplesAssignedTo(trx, params, userId)),
    listPublished: (params) =>
      withTransaction(db, (trx) => listPublishedSamples(trx, params)),
    get: (id, userId) =>
      withTransaction(db, (trx) => getSample(trx, id, userId)),
    getPublishedByIgsn: (igsn) =>
      withTransaction(db, (trx) => getPublishedSampleByIgsn(trx, igsn)),
    // Sample and owner in one transaction: an unowned sample would be
    // unreachable for everyone, including its creator.
    create: (input, ownerId) =>
      withTransaction(db, async (trx) => {
        const sample = await insertSample(trx, input);
        await insertSampleOwner(trx, sample.id, ownerId);
        return sample;
      }),
    update: (id, input) =>
      withTransaction(db, (trx) => updateSample(trx, id, input)),
    publish: (id) => withTransaction(db, (trx) => publishSample(trx, id)),
  };
}
