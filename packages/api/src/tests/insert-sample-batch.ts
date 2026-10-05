import type {
  SampleBatch,
  SampleBatchWebhook,
} from "@projet-igsn/domain/sample-batch/model";
import type { SampleBatchItemWrite } from "@projet-igsn/domain/sample-batch/repository";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

import { createSampleBatchRepository } from "../sample-batch/repository.ts";

export function insertSampleBatch(
  db: Kysely<DB>,
  serviceAccountId: string,
  ownerId: string,
  items: SampleBatchItemWrite[],
  webhook?: SampleBatchWebhook,
): Promise<SampleBatch> {
  return createSampleBatchRepository(db).create({
    serviceAccountId,
    ownerId,
    groups: {
      institutionalOrganization: null,
      institutionalOsu: null,
      institutionalLaboratory: "UMR7358",
    },
    items,
    webhook,
  });
}
