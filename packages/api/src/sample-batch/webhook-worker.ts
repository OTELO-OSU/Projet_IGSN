import type { Kysely } from "kysely";

import { sql } from "kysely";
import { createHmac } from "node:crypto";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

import type { DB } from "../db.ts";

import { startPolling } from "../sample/service/publishing-worker.ts";
import { webhookTarget } from "./public-host.ts";

const WEBHOOK_RETRY_DELAYS_MS = [
  60_000, 300_000, 1_800_000, 7_200_000, 21_600_000, 43_200_000,
];

const SEND_TIMEOUT_MS = 10_000;

const PAGE_SIZE = 50;

export type Send = (
  url: string,
  body: string,
  headers: Record<string, string>,
) => Promise<boolean>;

export const sendWebhook: Send = async (url, body, headers) => {
  const target = webhookTarget(url);
  if (target === null) return false;
  const request = target.url.protocol === "http:" ? httpRequest : httpsRequest;
  return new Promise((resolve) => {
    const req = request(
      target.url,
      {
        method: "POST",
        headers,
        lookup: target.lookup,
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      },
      (res) => {
        res.resume();
        const status = res.statusCode ?? 0;
        resolve(status >= 200 && status < 300);
      },
    );
    req.on("error", () => resolve(false));
    req.end(body);
  });
};

const headersOf = (id: string, body: string, secret: string) => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return {
    "Content-Type": "application/json",
    "X-Webhook-Id": id,
    "X-Webhook-Timestamp": timestamp,
    "X-Signature": `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`,
  };
};

// ponytail: single-replica ceiling, claim the due rows with FOR UPDATE SKIP LOCKED if the api ever scales past one replica.
export async function drainWebhookDeliveries(
  db: Kysely<DB>,
  send: Send = sendWebhook,
  delays: readonly number[] = WEBHOOK_RETRY_DELAYS_MS,
): Promise<void> {
  for (;;) {
    const due = await db
      .selectFrom("webhook_delivery")
      .innerJoin(
        "sample_batch_webhook",
        "sample_batch_webhook.batch_id",
        "webhook_delivery.batch_id",
      )
      .select([
        "webhook_delivery.id",
        "webhook_delivery.batch_id",
        "webhook_delivery.sample_id",
        "webhook_delivery.body",
        "webhook_delivery.attempt",
        "sample_batch_webhook.url",
        "sample_batch_webhook.secret",
      ])
      .where("webhook_delivery.next_attempt_at", "<=", sql<Date>`now()`)
      .orderBy("webhook_delivery.next_attempt_at")
      .limit(PAGE_SIZE)
      .execute();
    if (due.length === 0) return;
    const delivered = await Promise.all(
      due.map(({ id, url, body, secret }) =>
        send(url, body, headersOf(id, body, secret)).catch(() => false),
      ),
    );
    const failed = due.filter((_delivery, index) => !delivered[index]);
    const retried = failed.filter(({ attempt }) => attempt < delays.length);
    for (const { batch_id, sample_id } of failed.filter(
      (delivery) => !retried.includes(delivery),
    )) {
      console.error("Webhook delivery dropped", {
        batchId: batch_id,
        sampleId: sample_id,
      });
    }
    const finished = due.filter((delivery) => !retried.includes(delivery));
    if (finished.length > 0) {
      await db
        .deleteFrom("webhook_delivery")
        .where(
          "id",
          "in",
          finished.map(({ id }) => id),
        )
        .execute();
    }
    if (retried.length > 0) {
      const delaySeconds = delays.map((delay) => delay / 1000);
      await db
        .updateTable("webhook_delivery")
        .set((eb) => ({
          attempt: eb("attempt", "+", 1),
          next_attempt_at: sql`now() + make_interval(secs => (${delaySeconds}::float8[])[attempt + 1])`,
        }))
        .where(
          "id",
          "in",
          retried.map(({ id }) => id),
        )
        .execute();
    }
  }
}

export function startWebhookWorker(db: Kysely<DB>): void {
  startPolling("Webhook delivery drain failed", () =>
    drainWebhookDeliveries(db),
  );
}
