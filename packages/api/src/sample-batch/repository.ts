import type { SampleBatchRepository } from "@projet-igsn/domain/sample-batch/repository";
import type { Kysely } from "kysely";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import {
  insertPublishingSample,
  updatePublishingSample,
} from "../sample/service/queue-publication.ts";
import { type Transactional, withTransaction } from "../transaction.ts";

export const BATCH_ITEM_COLUMNS = [
  "sample_batch_item.partner_id as partnerId",
  "sample.id",
  "sample.status",
  "sample.igsn",
  "sample.publishing_error as publishingError",
] as const;

const readItems = (
  db: Transactional<DB>,
  batchId: string,
  serviceAccountId: string,
) =>
  db
    .selectFrom("sample_batch_item")
    .innerJoin("sample", "sample.id", "sample_batch_item.sample_id")
    .select(BATCH_ITEM_COLUMNS)
    .where("sample_batch_item.batch_id", "=", batchId)
    .where("sample_batch_item.service_account_id", "=", serviceAccountId)
    .orderBy("sample_batch_item.position")
    .execute();

export function createSampleBatchRepository(
  db: Kysely<DB>,
): SampleBatchRepository {
  return {
    create: ({ serviceAccountId, ownerId, groups, items, webhook }) =>
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
          } else if ("update" in item) {
            sampleId = item.update.id;
            await updatePublishingSample(
              trx,
              sampleId,
              item.update.input,
              item.update.updatedAt,
            );
          } else {
            sampleId = item.unchanged.id;
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
        if (webhook) {
          await trx
            .insertInto("sample_batch_webhook")
            .values({
              batch_id: batchId,
              service_account_id: serviceAccountId,
              url: webhook.url,
              secret: webhook.secret,
            })
            .execute();
        }
        return {
          id: batchId,
          items: await readItems(trx, batchId, serviceAccountId),
        };
      }),
    get: (id, serviceAccountId) =>
      withTransaction(db, async (trx) => {
        const items = await readItems(trx, id, serviceAccountId);
        return items.length === 0 ? null : { id, items };
      }),
  };
}
