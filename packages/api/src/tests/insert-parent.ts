import type {
  Sample,
  SynchronizationStatus,
} from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

import { publishSample } from "../sample/service/publish-sample.ts";
import { setSampleStatus } from "../sample/service/set-sample-status.ts";
import { insertOwned } from "./insert-owned.ts";
import { publishableSample } from "./sample-fixtures.ts";

const EMBARGO_PUBLICATION_DATE = "2099-01-01";

export async function insertParent(
  db: Kysely<DB>,
  ownerId: string,
  status:
    | Sample["status"]
    | Exclude<SynchronizationStatus, "synced"> = "published",
  name: string = publishableSample.name,
): Promise<Sample> {
  const created = await insertOwned(db, ownerId, { name }, false);
  if (status === "draft") return created;
  if (status === "pending" || status === "failed") {
    await db
      .updateTable("sample")
      .set({ synchronization_status: status })
      .where("id", "=", created.id)
      .execute();
    return { ...created, synchronizationStatus: status };
  }
  const published = await publishSample(
    db,
    created.id,
    status === "tombstone" ? "published" : status,
    null,
    status === "embargo" ? EMBARGO_PUBLICATION_DATE : undefined,
  );
  if (status !== "tombstone") return published!;
  return (await setSampleStatus(db, created.id, { status: "tombstone" }))!;
}
