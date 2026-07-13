import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { readLocation } from "./read-location.ts";
import { toSample } from "./to-sample.ts";
import { upsertSampleAge } from "./upsert-sample-age.ts";
import { writeLocation } from "./write-location.ts";

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
      texture: input.texture ?? null,
      metamorphic_facies: input.metamorphicFacies ?? null,
      collection_method: input.collectionMethod ?? null,
      collection_method_description: input.collectionMethodDescription ?? null,
      specific_name: input.specificName ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  await writeLocation(db, row.id, input.location);
  const ageRow = await upsertSampleAge(db, row.id, input.age);
  return toSample(row, await readLocation(db, row.id), ageRow);
}
