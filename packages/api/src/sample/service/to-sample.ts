import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { Selectable } from "kysely";

import { type Sample, sampleSchema } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

// DB row (snake_case) -> domain Sample (camelCase), validated at the boundary.
// The location lives in its own 1:1 table (see read-location.ts) and the age in
// its own 0:1 table, so both are read separately and passed in. An absent age
// row -> null age; sampleSchema.parse validates the location and age codes too.
export function toSample(
  row: Selectable<DB["sample"]>,
  location: Location | null,
  ageRow?: Selectable<DB["sample_age"]>,
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
    age: ageRow
      ? {
          numericAge: ageRow.numeric_age,
          numericAgeUnit: ageRow.numeric_age_unit,
          numericAgeYearsUnit: ageRow.numeric_age_years_unit,
          numericAgeMin: ageRow.numeric_age_min,
          numericAgeMinUnit: ageRow.numeric_age_min_unit,
          numericAgeMinYearsUnit: ageRow.numeric_age_min_years_unit,
          numericAgeMax: ageRow.numeric_age_max,
          numericAgeMaxUnit: ageRow.numeric_age_max_unit,
          numericAgeMaxYearsUnit: ageRow.numeric_age_max_years_unit,
          geologicalAge: ageRow.geological_age,
          geologicalAgeMin: ageRow.geological_age_min,
          geologicalAgeMax: ageRow.geological_age_max,
          geologicalUnit: ageRow.geological_unit,
        }
      : null,
    igsn: row.igsn,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
