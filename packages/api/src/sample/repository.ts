import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";
import { insertSample } from "./service/insert-sample.ts";
import { listSamples } from "./service/list-sample.ts";

export function createSampleRepository(db: Kysely<DB>): SampleRepository {
  return {
    list: (params) => withTransaction(db, (trx) => listSamples(trx, params)),
    create: (input) => withTransaction(db, (trx) => insertSample(trx, input)),
  };
}
