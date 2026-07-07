import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";
import { getPublishedSampleByIgsn } from "./service/get-published-sample-by-igsn.ts";
import { getSample } from "./service/get-sample.ts";
import { insertSample } from "./service/insert-sample.ts";
import { listSamples } from "./service/list-sample.ts";
import { publishSample } from "./service/publish-sample.ts";
import { updateSample } from "./service/update-sample.ts";

export function createSampleRepository(db: Kysely<DB>): SampleRepository {
  return {
    list: (params) => withTransaction(db, (trx) => listSamples(trx, params)),
    listPublished: (params) =>
      withTransaction(db, (trx) => listSamples(trx, params, true)),
    get: (id) => withTransaction(db, (trx) => getSample(trx, id)),
    getPublishedByIgsn: (igsn) =>
      withTransaction(db, (trx) => getPublishedSampleByIgsn(trx, igsn)),
    create: (input) => withTransaction(db, (trx) => insertSample(trx, input)),
    update: (id, input) =>
      withTransaction(db, (trx) => updateSample(trx, id, input)),
    publish: (id) => withTransaction(db, (trx) => publishSample(trx, id)),
  };
}
