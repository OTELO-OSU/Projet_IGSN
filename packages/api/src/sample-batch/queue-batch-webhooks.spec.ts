import type { SampleBatchWebhook } from "@projet-igsn/domain/sample-batch/model";
import type { SampleBatchItemWrite } from "@projet-igsn/domain/sample-batch/repository";
import type { Kysely } from "kysely";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { afterEach, describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";

import { publishSample } from "../sample/service/publish-sample.ts";
import { drainPublishingQueue } from "../sample/service/publishing-worker.ts";
import { insertSampleBatch } from "../tests/insert-sample-batch.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { STUB_DATACITE_CONFIG, stubDataCite } from "../tests/stub-datacite.ts";

const WEBHOOK = {
  url: "https://partner.example.org/hooks/igsn",
  secret: "a-partner-shared-secret",
};

async function arrangeBatch(db: Kysely<DB>) {
  const owner = await insertUser(db, "jean.martin-q4h@univ-lorraine.fr");
  const account = await insertServiceAccount(db, "Harvester", owner.id);
  return async (
    items: SampleBatchItemWrite[],
    webhook: SampleBatchWebhook | null = WEBHOOK,
  ) => {
    const batch = await insertSampleBatch(
      db,
      account.id,
      owner.id,
      items,
      webhook ?? undefined,
    );
    return { batchId: batch.id, ids: batch.items.map(({ id }) => id) };
  };
}

const deliveries = async (db: Kysely<DB>) =>
  (
    await db
      .selectFrom("webhook_delivery")
      .select(["batch_id", "sample_id", "body", "attempt"])
      .orderBy("sample_id")
      .orderBy("id")
      .execute()
  ).map(({ body, ...row }) => ({ ...row, body: JSON.parse(body) }));

describe("queueBatchWebhooks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  pgTest(
    "should queue one delivery per published item of a webhook batch, carrying its payload",
    async ({ db }) => {
      // Arrange
      const create = await arrangeBatch(db);
      const { batchId, ids } = await create([
        { partnerId: "p-1", create: publishableSample },
        { partnerId: "p-2", create: publishableSample },
      ]);
      // Act
      for (const id of ids) await publishSample(db, id);
      // Assert
      expect(await deliveries(db)).toEqual(
        ids.map((id, index) => ({
          batch_id: batchId,
          sample_id: id,
          attempt: 0,
          body: {
            batchId,
            partnerId: `p-${index + 1}`,
            id,
            status: "published",
            igsn: generateIgsnSuffix(id),
            publishingError: null,
          },
        })),
      );
    },
  );

  pgTest("should queue nothing for a batch without webhook", async ({ db }) => {
    // Arrange
    const create = await arrangeBatch(db);
    const { ids } = await create(
      [{ partnerId: "p-1", create: publishableSample }],
      null,
    );
    // Act
    await publishSample(db, ids[0]!);
    // Assert
    expect(await deliveries(db)).toEqual([]);
  });

  pgTest(
    "should queue one delivery per item the publishing queue fails, carrying its error",
    async ({ db }) => {
      // Arrange
      stubDataCite(new Response("DataCite is down", { status: 500 }));
      const create = await arrangeBatch(db);
      const { batchId, ids } = await create([
        { partnerId: "p-1", create: publishableSample },
        { partnerId: "p-2", create: publishableSample },
      ]);
      // Act
      await drainPublishingQueue(db, STUB_DATACITE_CONFIG, []);
      // Assert
      expect(
        (await deliveries(db)).map(
          ({ body: { igsn: _igsn, ...body } }) => body,
        ),
      ).toEqual(
        ids.map((id, index) => ({
          batchId,
          partnerId: `p-${index + 1}`,
          id,
          status: "publish_failed",
          publishingError: expect.any(String),
        })),
      );
    },
  );

  pgTest(
    "should queue again on a later publication of the same sample",
    async ({ db }) => {
      // Arrange
      const create = await arrangeBatch(db);
      const { ids } = await create([
        { partnerId: "p-1", create: publishableSample },
      ]);
      await publishSample(db, ids[0]!);
      // Act
      await publishSample(db, ids[0]!);
      // Assert
      expect(await deliveries(db)).toHaveLength(2);
    },
  );

  pgTest.for([
    {
      rule: "nothing when only an older batch has a webhook",
      older: WEBHOOK,
      newer: null,
      expected: [],
    },
    {
      rule: "the newer batch when it alone has a webhook",
      older: null,
      newer: WEBHOOK,
      expected: ["newer"],
    },
  ])(
    "should target the newest batch of the sample, queuing $rule",
    async ({ older, newer, expected }, { db }) => {
      // Arrange
      const create = await arrangeBatch(db);
      const { ids } = await create(
        [{ partnerId: "older", create: publishableSample }],
        older,
      );
      const { batchId: newerId } = await create(
        [{ partnerId: "newer", unchanged: { id: ids[0]! } }],
        newer,
      );
      // Act
      await publishSample(db, ids[0]!);
      // Assert
      expect(
        (await deliveries(db)).map(({ batch_id, body }) => [
          batch_id,
          body.partnerId,
        ]),
      ).toEqual(expected.map((partnerId) => [newerId, partnerId]));
    },
  );
});
