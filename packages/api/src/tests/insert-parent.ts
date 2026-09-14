import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { setSampleStatus } from "../sample/service/set-sample-status.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { publishableSample } from "./sample-fixtures.ts";

export async function insertParent(
  db: Kysely<DB>,
  ownerId: string,
  status: Sample["status"] = "published",
  name: string = publishableSample.name,
): Promise<Sample> {
  const created = await insertSample(db, { ...publishableSample, name });
  await insertSampleOwner(db, created.id, ownerId);
  if (status === "draft") return created;
  const published = await publishSample(
    db,
    created.id,
    status === "tombstone" ? "published" : status,
  );
  if (status !== "tombstone") return published!;
  return (await setSampleStatus(db, created.id, "tombstone"))!;
}
