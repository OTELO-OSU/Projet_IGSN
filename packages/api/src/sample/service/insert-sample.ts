import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { toSample } from "./to-sample.ts";

export async function insertSample(
  db: Transactional<DB>,
  input: CreateSample,
): Promise<Sample> {
  const row = await db
    .insertInto("sample")
    .values({
      id: uuidv7(),
      name: input.name,
      nature: input.nature,
      type: input.type,
      material: input.material ?? null,
      collection_method: input.collectionMethod ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return toSample(row);
}
