import type { Selectable } from "kysely";

import { type Sample, sampleSchema } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

// DB row (snake_case) -> domain Sample (camelCase), validated at the boundary.
export function toSample(row: Selectable<DB["sample"]>): Sample {
  return sampleSchema.parse({
    id: row.id,
    name: row.name,
    nature: row.nature,
    type: row.type,
    material: row.material,
    texture: row.texture,
    metamorphicFacies: row.metamorphic_facies,
    collectionMethod: row.collection_method,
    collectionMethodDescription: row.collection_method_description,
    specificName: row.specific_name,
    // Location storage lands with the PostGIS layer; until then samples carry none.
    location: null,
    igsn: row.igsn,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
