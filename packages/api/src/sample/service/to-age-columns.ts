import type { CreateSample } from "@projet-igsn/domain/sample/sample";

// Domain age -> the sample table's flat age columns. A null age clears every
// column (so the stored age mirrors exactly what was submitted). Shared by
// insert and update so the mapping never drifts.
export function toAgeColumns(age: CreateSample["age"]) {
  return {
    numeric_age_min: age?.numericAgeMin ?? null,
    numeric_age_max: age?.numericAgeMax ?? null,
    numeric_age_unit: age?.numericAgeUnit ?? null,
    numeric_age_years_unit: age?.numericAgeYearsUnit ?? null,
    geological_age_min: age?.geologicalAgeMin ?? null,
    geological_age_max: age?.geologicalAgeMax ?? null,
    geological_unit: age?.geologicalUnit ?? null,
  };
}
