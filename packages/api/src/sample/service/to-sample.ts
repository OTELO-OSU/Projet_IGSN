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
    igsn: row.igsn,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
