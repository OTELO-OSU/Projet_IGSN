import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";
import type { Transactional } from "../transaction.ts";

import { BATCH_ITEM_COLUMNS } from "./repository.ts";

export async function queueBatchWebhooks(
  db: Transactional<DB>,
  sampleIds: readonly string[],
): Promise<void> {
  if (sampleIds.length === 0) return;
  const newest = await db
    .selectFrom("sample_batch_item")
    .innerJoin("sample", "sample.id", "sample_batch_item.sample_id")
    .leftJoin(
      "sample_batch_webhook",
      "sample_batch_webhook.batch_id",
      "sample_batch_item.batch_id",
    )
    .distinctOn("sample_batch_item.sample_id")
    .select([
      ...BATCH_ITEM_COLUMNS,
      "sample_batch_item.batch_id as batchId",
      "sample_batch_webhook.batch_id as webhookBatchId",
    ])
    .where("sample_batch_item.sample_id", "in", sampleIds)
    .orderBy("sample_batch_item.sample_id")
    .orderBy("sample_batch_item.batch_id", "desc")
    .execute();
  const called = newest.filter(({ webhookBatchId }) => webhookBatchId !== null);
  if (called.length === 0) return;
  await db
    .insertInto("webhook_delivery")
    .values(
      called.map(({ webhookBatchId: _webhook, batchId, ...item }) => ({
        id: uuidv7(),
        batch_id: batchId,
        sample_id: item.id,
        body: JSON.stringify({ batchId, ...item }),
      })),
    )
    .execute();
}
