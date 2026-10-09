import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { publishableSample } from "./sample-fixtures.ts";

export async function insertOwned(
  db: Kysely<DB>,
  ownerId: string,
  input: Partial<CreateSample>,
  published = true,
): Promise<Sample> {
  const created = await insertSample(db, { ...publishableSample, ...input });
  await insertSampleOwner(db, created.id, ownerId);
  return published ? (await publishSample(db, created.id))! : created;
}
