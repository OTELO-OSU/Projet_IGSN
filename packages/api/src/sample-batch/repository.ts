import type { SampleBatchRepository } from "@projet-igsn/domain/sample-batch/repository";
import type { Kysely } from "kysely";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import {
  insertPublishingSample,
  updatePublishingSample,
} from "../sample/service/queue-publication.ts";
import { withTransaction } from "../transaction.ts";

export function createSampleBatchRepository(
  db: Kysely<DB>,
): SampleBatchRepository {
  return {
    create: ({ serviceAccountId, ownerId, groups, items }) =>
      withTransaction(db, async (trx) => {
        const batchId = uuidv7();
        const rows = [];
        for (const [position, item] of items.entries()) {
          let sampleId: string;
          if ("create" in item) {
            sampleId = await insertPublishingSample(
              trx,
              item.create,
              ownerId,
              groups,
              null,
            );
          } else {
            sampleId = item.update.id;
            await updatePublishingSample(trx, sampleId, item.update.input);
          }
          rows.push({
            batch_id: batchId,
            sample_id: sampleId,
            position,
            partner_id: item.partnerId,
            service_account_id: serviceAccountId,
          });
        }
        await trx.insertInto("sample_batch_item").values(rows).execute();
        return batchId;
      }),
    get: (id, serviceAccountId) =>
      withTransaction(db, async (trx) => {
        const items = await trx
          .selectFrom("sample_batch_item")
          .innerJoin("sample", "sample.id", "sample_batch_item.sample_id")
          .select([
            "sample_batch_item.partner_id as partnerId",
            "sample.id",
            "sample.status",
            "sample.igsn",
            "sample.publishing_error as publishingError",
          ])
          .where("sample_batch_item.batch_id", "=", id)
          .where("sample_batch_item.service_account_id", "=", serviceAccountId)
          .orderBy("sample_batch_item.position")
          .execute();
        return items.length === 0 ? null : { id, items };
      }),
  };
}
