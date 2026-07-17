import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { descriptionColumns } from "./description-columns.ts";
import { locationColumns } from "./to-location.ts";
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
      metamorphic_facies: input.metamorphicFacies ?? null,
      collection_method: input.collectionMethod ?? null,
      collection_method_description: input.collectionMethodDescription ?? null,
      specific_name: input.specificName ?? null,
      ...descriptionColumns(input.description),
      ...locationColumns(input.location),
      updated_at: sql`now()`,
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
  if (!row) return null;
  return toSample(row);
}
