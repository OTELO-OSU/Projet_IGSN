import type { Kysely } from "kysely";

import { setTimeout } from "node:timers/promises";

import type { DataCiteConfig } from "../../datacite/config.ts";
import type { DB } from "../../db.ts";

import { DataCiteRefusal } from "../../datacite/put-doi.ts";
import { syncDoi } from "../../datacite/sync-doi.ts";
import { queueBatchWebhooks } from "../../sample-batch/queue-batch-webhooks.ts";
import { withTransaction } from "../../transaction.ts";
import { getSampleById } from "./get-sample-by-id.ts";
import { publishSample } from "./publish-sample.ts";

export const RETRY_DELAYS_MS = [10_000, 60_000, 240_000, 600_000, 900_000];

const POLL_MS = 10_000;

function messageOf(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause instanceof Error) return cause.message;
  return error instanceof Error ? error.message : String(error);
}

function isPermanentRefusal(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  return (
    cause instanceof DataCiteRefusal &&
    cause.status >= 400 &&
    cause.status < 500 &&
    cause.status !== 429
  );
}

function synchronize(
  db: Kysely<DB>,
  id: string,
  dataCite: DataCiteConfig | null,
): Promise<void> {
  return withTransaction(db, async (trx) => {
    const row = await trx
      .updateTable("sample")
      .set({ synchronization_status: "synced", synchronization_error: null })
      .where("id", "=", id)
      .where("synchronization_status", "=", "pending")
      .returning("status")
      .executeTakeFirst();
    if (!row) return;
    if (row.status === "draft") {
      await publishSample(trx, id, "published", dataCite);
      return;
    }
    await syncDoi(dataCite, trx, await getSampleById(trx, id));
    await queueBatchWebhooks(trx, [id]);
  });
}

async function synchronizeWithRetry(
  db: Kysely<DB>,
  id: string,
  dataCite: DataCiteConfig | null,
  delays: readonly number[],
): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      await synchronize(db, id, dataCite);
      return null;
    } catch (error) {
      if (attempt >= delays.length || isPermanentRefusal(error)) {
        return messageOf(error);
      }
      await setTimeout(delays[attempt]);
    }
  }
}

// ponytail: single-replica ceiling, claim the row with FOR UPDATE SKIP LOCKED if the api ever scales past one replica.
export async function drainSynchronizationQueue(
  db: Kysely<DB>,
  dataCite: DataCiteConfig | null,
  delays: readonly number[] = RETRY_DELAYS_MS,
): Promise<void> {
  for (;;) {
    const next = await db
      .selectFrom("sample")
      .select("id")
      .where("synchronization_status", "=", "pending")
      .orderBy("id")
      .limit(1)
      .executeTakeFirst();
    if (!next) return;
    const failure = await synchronizeWithRetry(db, next.id, dataCite, delays);
    if (failure === null) continue;
    await withTransaction(db, async (trx) => {
      await trx
        .updateTable("sample")
        .set({
          synchronization_status: "failed",
          synchronization_error: failure,
        })
        .where("id", "=", next.id)
        .execute();
      await queueBatchWebhooks(trx, [next.id]);
    });
  }
}

export function startPolling(label: string, drain: () => Promise<void>): void {
  void (async () => {
    for (;;) {
      try {
        await drain();
      } catch (error) {
        console.error(label, error);
      }
      await setTimeout(POLL_MS);
    }
  })();
}

export function startSynchronizationWorker(
  db: Kysely<DB>,
  dataCite: DataCiteConfig | null,
): void {
  startPolling("Synchronization queue drain failed", () =>
    drainSynchronizationQueue(db, dataCite),
  );
}
