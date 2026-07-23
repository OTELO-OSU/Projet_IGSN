import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { sql } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { conditionColumns } from "./condition-columns.ts";
import { descriptionColumns } from "./description-columns.ts";
import { economicInterestColumns } from "./economic-interest-columns.ts";
import { replaceSampleLinks } from "./replace-sample-links.ts";
import { securityColumns } from "./security-columns.ts";
import { toAgeColumns } from "./to-age-columns.ts";
import { locationColumns } from "./to-location.ts";
import { withSampleChildren } from "./with-sample-children.ts";

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
      availability: input.availability ?? null,
      ...descriptionColumns(input.description),
      ...locationColumns(input.location),
      ...conditionColumns(input.condition),
      ...toAgeColumns(input.age),
      ...securityColumns(input.security),
      ...economicInterestColumns(input),
      updated_at: sql`now()`,
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
  if (!row) return null;
  // PUT semantics, like every other field: absent links clear the links.
  await replaceSampleLinks(db, id, input.links ?? []);
  const [sample] = await withSampleChildren(db, [row]);
  return sample!;
}
