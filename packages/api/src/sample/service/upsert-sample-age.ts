import type { Age } from "@projet-igsn/domain/sample/age/model";
import type { Selectable } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

// Writes the sample's 0:1 age row: upsert when an age is provided, delete it
// when the age is null/undefined (so the stored age mirrors exactly what was
// submitted). Returns the stored row (or undefined) for toSample.
export async function upsertSampleAge(
  db: Transactional<DB>,
  sampleId: string,
  age: Age | null | undefined,
): Promise<Selectable<DB["sample_age"]> | undefined> {
  if (age == null) {
    await db
      .deleteFrom("sample_age")
      .where("sample_id", "=", sampleId)
      .execute();
    return undefined;
  }
  const values = {
    sample_id: sampleId,
    numeric_age: age.numericAge,
    numeric_age_unit: age.numericAgeUnit,
    numeric_age_years_unit: age.numericAgeYearsUnit,
    numeric_age_min: age.numericAgeMin,
    numeric_age_min_unit: age.numericAgeMinUnit,
    numeric_age_min_years_unit: age.numericAgeMinYearsUnit,
    numeric_age_max: age.numericAgeMax,
    numeric_age_max_unit: age.numericAgeMaxUnit,
    numeric_age_max_years_unit: age.numericAgeMaxYearsUnit,
    geological_age: age.geologicalAge,
    geological_age_min: age.geologicalAgeMin,
    geological_age_max: age.geologicalAgeMax,
    geological_unit: age.geologicalUnit,
  };
  return db
    .insertInto("sample_age")
    .values(values)
    .onConflict((oc) => oc.column("sample_id").doUpdateSet(values))
    .returningAll()
    .executeTakeFirstOrThrow();
}
