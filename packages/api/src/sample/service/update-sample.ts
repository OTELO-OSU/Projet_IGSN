import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { readLocation } from "./read-location.ts";
import { toSample } from "./to-sample.ts";
import { upsertSampleAge } from "./upsert-sample-age.ts";
import { writeLocation } from "./write-location.ts";

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
      metamorphic_facies: input.metamorphicFacies ?? null,
      collection_method: input.collectionMethod ?? null,
      collection_method_description: input.collectionMethodDescription ?? null,
      specific_name: input.specificName ?? null,
      updated_at: sql`now()`,
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
  if (!row) return null;
  await writeLocation(db, id, input.location);
  const ageRow = await upsertSampleAge(db, id, input.age);
  return toSample(row, await readLocation(db, id), ageRow);
}
