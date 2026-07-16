import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { Selectable } from "kysely";

import { type Sample, sampleSchema } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

// `date` columns come back from postgres.js as UTC-midnight Date objects;
// slicing the ISO string recovers the day with no timezone drift (ADR 0015).
function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

// A measurement exists only when both halves do; the schema then enforces the
// value/unit coupling on parse.
function measurement(value: number | null, unit: string | null) {
  return value !== null && unit !== null ? { value, unit } : null;
}

// Flat description columns -> nested domain description (ADR 0015). Absent
// parts are omitted rather than set to null, so a stored description
// round-trips to the same minimal shape the client sent; null when every part
// is absent, so a sample without one carries `description: null`.
function toDescription(row: Selectable<DB["sample"]>) {
  const parts = {
    collectionDate:
      row.collection_date_start !== null && row.collection_date_end !== null
        ? {
            start: toIsoDate(row.collection_date_start),
            end: toIsoDate(row.collection_date_end),
          }
        : null,
    oriented: row.oriented,
    orientationExplanation: row.orientation_explanation,
    openDescription: row.open_description,
    length: measurement(row.length_value, row.length_unit),
    width: measurement(row.width_value, row.width_unit),
    thickness: measurement(row.thickness_value, row.thickness_unit),
    mass: measurement(row.mass_value, row.mass_unit),
    volume: measurement(row.volume_value, row.volume_unit),
  };
  const description = Object.fromEntries(
    Object.entries(parts).filter(([, part]) => part !== null),
  );
  return Object.keys(description).length > 0 ? description : null;
}

// DB row (snake_case) -> domain Sample (camelCase), validated at the boundary.
// The location lives in its own 1:1 table (see read-location.ts), so it is read
// separately and passed in.
export function toSample(
  row: Selectable<DB["sample"]>,
  location: Location | null,
): Sample {
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
    location,
    description: toDescription(row),
    igsn: row.igsn,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
