import type { SampleBatchWebhook } from "@projet-igsn/domain/sample-batch/model";
import type { Kysely } from "kysely";

import { sql } from "kysely";
import { createHmac } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { type AddressInfo, createServer } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DB } from "../db.ts";

import { publishSample } from "../sample/service/publish-sample.ts";
import { insertSampleBatch } from "../tests/insert-sample-batch.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import {
  type Send,
  drainWebhookDeliveries,
  sendWebhook,
} from "./webhook-worker.ts";

const HOOK_URL = "https://partner.example.org/hooks/igsn";
const SECRET = "a-partner-shared-secret";

async function queueDelivery(db: Kysely<DB>, webhook: SampleBatchWebhook) {
  const owner = await insertUser(db, "jean.martin-w9k@univ-lorraine.fr");
  const account = await insertServiceAccount(db, "Harvester", owner.id);
  const batch = await insertSampleBatch(
    db,
    account.id,
    owner.id,
    [{ partnerId: "p-1", create: publishableSample }],
    webhook,
  );
  const sampleId = batch.items[0]!.id;
  await publishSample(db, sampleId);
  return { batchId: batch.id, sampleId };
}

const deliveryCount = async (db: Kysely<DB>) =>
  (await db.selectFrom("webhook_delivery").select("id").execute()).length;

describe("drainWebhookDeliveries", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  pgTest(
    "should post the queued body as json with its delivery id and timestamp, signed over both with the secret",
    async ({ db }) => {
      // Arrange
      await queueDelivery(db, { url: HOOK_URL, secret: SECRET });
      const { id } = await db
        .selectFrom("webhook_delivery")
        .select("id")
        .executeTakeFirstOrThrow();
      const send = vi.fn<Send>().mockResolvedValue(true);
      const before = Math.floor(Date.now() / 1000);
      // Act
      await drainWebhookDeliveries(db, send, [0, 0]);
      // Assert
      const [[url, body, headers]] = send.mock.calls as [Parameters<Send>];
      const timestamp = headers["X-Webhook-Timestamp"] ?? "";
      expect(Number(timestamp)).toBeGreaterThanOrEqual(before);
      expect([url, headers]).toEqual([
        HOOK_URL,
        {
          "Content-Type": "application/json",
          "X-Webhook-Id": id,
          "X-Webhook-Timestamp": timestamp,
          "X-Signature": `sha256=${createHmac("sha256", SECRET).update(`${timestamp}.${body}`).digest("hex")}`,
        },
      ]);
    },
  );

  pgTest("should delete a delivery the webhook accepted", async ({ db }) => {
    // Arrange
    await queueDelivery(db, { url: HOOK_URL, secret: SECRET });
    // Act
    await drainWebhookDeliveries(db, async () => true, [0, 0]);
    // Assert
    expect(await deliveryCount(db)).toBe(0);
  });

  pgTest(
    "should hold a failed delivery in the database until its delay is due",
    async ({ db }) => {
      // Arrange
      await queueDelivery(db, { url: HOOK_URL, secret: SECRET });
      const send = vi.fn<Send>().mockResolvedValue(false);
      // Act
      await drainWebhookDeliveries(db, send, [60_000]);
      await drainWebhookDeliveries(db, send, [60_000]);
      // Assert
      expect(send).toHaveBeenCalledTimes(1);
      expect(
        await db
          .selectFrom("webhook_delivery")
          .select((eb) => [
            "attempt",
            sql<number>`extract(epoch from ${eb.ref("next_attempt_at")} - now())::int`.as(
              "dueInSeconds",
            ),
          ])
          .execute(),
      ).toEqual([{ attempt: 1, dueInSeconds: 60 }]);
    },
  );

  pgTest(
    "should count a send that throws as a failed attempt",
    async ({ db }) => {
      // Arrange
      await queueDelivery(db, { url: HOOK_URL, secret: SECRET });
      const send = vi.fn<Send>().mockRejectedValue(new Error("boom"));
      // Act
      await drainWebhookDeliveries(db, send, [60_000]);
      // Assert
      expect(
        await db.selectFrom("webhook_delivery").select("attempt").execute(),
      ).toEqual([{ attempt: 1 }]);
    },
  );

  pgTest(
    "should retry a failing delivery on each delay, then drop it and log it without the secret",
    async ({ db }) => {
      // Arrange
      const { batchId, sampleId } = await queueDelivery(db, {
        url: HOOK_URL,
        secret: SECRET,
      });
      const send = vi.fn<Send>().mockResolvedValue(false);
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      // Act
      await drainWebhookDeliveries(db, send, [0, 0]);
      // Assert
      expect(send).toHaveBeenCalledTimes(3);
      expect(await deliveryCount(db)).toBe(0);
      expect(JSON.stringify(logged.mock.calls)).toContain(batchId);
      expect(JSON.stringify(logged.mock.calls)).toContain(sampleId);
      expect(JSON.stringify(logged.mock.calls)).not.toContain(SECRET);
    },
  );
});

describe("sendWebhook", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["https://127.0.0.1", "https://localhost"])(
    "should refuse %s without connecting to it",
    async (origin) => {
      // Arrange
      const server = createServer((socket) => socket.destroy());
      const connected = vi.fn();
      server.on("connection", connected);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const { port } = server.address() as AddressInfo;
      // Act
      const delivered = await sendWebhook(`${origin}:${port}/hook`, "{}", {
        "Content-Type": "application/json",
      });
      server.close();
      // Assert
      expect(delivered).toBe(false);
      expect(connected).not.toHaveBeenCalled();
    },
  );

  it("should deliver over http to a dev host on a private address", async () => {
    // Arrange
    vi.stubEnv("WEBHOOK_DEV_HOSTS", "localhost");
    const received = vi.fn();
    const server = createHttpServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += chunk;
      received(body);
      res.writeHead(204).end();
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    // Act
    const delivered = await sendWebhook(
      `http://localhost:${port}/hook`,
      '{"id":"s-1"}',
      { "Content-Type": "application/json" },
    );
    server.close();
    // Assert
    expect(delivered).toBe(true);
    expect(received).toHaveBeenCalledWith('{"id":"s-1"}');
  });
});
