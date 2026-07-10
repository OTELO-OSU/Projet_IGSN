import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { toSample } from "./to-sample.ts";

export async function updateSample(
  db: Transactional<DB>,
  id: string,
  input: CreateSample,
): Promise<Sample | null> {
  const row = await db
    .updateTable("sample")
    // Fields listed explicitly: never spread request input into an update.
    .set({
      name: input.name,
      nature: input.nature,
      type: input.type,
      material: input.material ?? null,
      texture: input.texture ?? null,
      collection_method: input.collectionMethod ?? null,
      specific_name: input.specificName ?? null,
      updated_at: sql`now()`,
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
  return row ? toSample(row) : null;
}
