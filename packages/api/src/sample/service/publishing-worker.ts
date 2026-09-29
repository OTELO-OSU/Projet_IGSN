import type { Kysely } from "kysely";

import { setTimeout } from "node:timers/promises";

import type { DataCiteConfig } from "../../datacite/config.ts";
import type { DB } from "../../db.ts";

import { withTransaction } from "../../transaction.ts";
import { publishSample } from "./publish-sample.ts";

export const RETRY_DELAYS_MS = [10_000, 60_000, 240_000, 600_000, 900_000];

export const POLL_MS = 10_000;

function messageOf(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  if (cause instanceof Error) return cause.message;
  return error instanceof Error ? error.message : String(error);
}

async function publishWithRetry(
  db: Kysely<DB>,
  id: string,
  dataCite: DataCiteConfig | null,
  delays: readonly number[],
): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      await withTransaction(db, (trx) =>
        publishSample(trx, id, "published", dataCite),
      );
      return null;
    } catch (error) {
      if (attempt >= delays.length) return messageOf(error);
      await setTimeout(delays[attempt]);
    }
  }
}

// ponytail: single-replica ceiling, claim the row with FOR UPDATE SKIP LOCKED if the api ever scales past one replica.
export async function drainPublishingQueue(
  db: Kysely<DB>,
  dataCite: DataCiteConfig | null,
  delays: readonly number[] = RETRY_DELAYS_MS,
): Promise<void> {
  for (;;) {
    const next = await db
      .selectFrom("sample")
      .select("id")
      .where("status", "=", "publishing")
      .orderBy("id")
      .limit(1)
      .executeTakeFirst();
    if (!next) return;
    const failure = await publishWithRetry(db, next.id, dataCite, delays);
    if (failure === null) continue;
    // ponytail: fail fast also sweeps a concurrent import's waiting rows (single-user alpha); scoping it per import needs an import-id column.
    await db
      .updateTable("sample")
      .set({ status: "publish_failed", publishing_error: failure })
      .where((eb) =>
        eb.or([eb("status", "=", "publishing"), eb("id", "=", next.id)]),
      )
      .execute();
    return;
  }
}

export function startPublishingWorker(
  db: Kysely<DB>,
  dataCite: DataCiteConfig | null,
): void {
  void (async () => {
    for (;;) {
      try {
        await drainPublishingQueue(db, dataCite);
      } catch (error) {
        console.error("Publishing queue drain failed", error);
      }
      await setTimeout(POLL_MS);
    }
  })();
}
