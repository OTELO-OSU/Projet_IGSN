import type { Age } from "@projet-igsn/domain/sample/age/model";

// The Age block held in the form store, mirroring the domain `Age` shape so the
// fields cast their own values (NumberField stores numbers, ComboboxField/
// TextField store undefined when cleared). Nullish is tolerated everywhere so
// an empty field can be null (default) or undefined (just cleared). A non-range
// value stores the same number/code in both bounds (min == max). Mapped to/from
// the domain Age here so the mapping is pure and unit-testable.
export type AgeFormValues = {
  numericAgeMin: number | null | undefined;
  numericAgeMax: number | null | undefined;
  numericAgeUnit: string | null | undefined;
  numericAgeYearsUnit: string | null | undefined;
  geologicalAgeMin: string | null | undefined;
  geologicalAgeMax: string | null | undefined;
  geologicalUnit: string | null | undefined;
};

export const EMPTY_AGE_FORM_VALUES: AgeFormValues = {
  numericAgeMin: null,
  numericAgeMax: null,
  numericAgeUnit: null,
  numericAgeYearsUnit: null,
  geologicalAgeMin: null,
  geologicalAgeMax: null,
  geologicalUnit: null,
};

// Persisted age -> form values, for edit prefill. Geological bounds are rank
// integers in the domain but strings in the string-keyed combobox, so stringify
// them; the rest of the domain Age shape fits the form store.
export function ageFormValues(age: Age | null | undefined): AgeFormValues {
  if (age == null) {
    return EMPTY_AGE_FORM_VALUES;
  }
  return {
    ...age,
    geologicalAgeMin: age.geologicalAgeMin?.toString() ?? null,
    geologicalAgeMax: age.geologicalAgeMax?.toString() ?? null,
  };
}

// Form values -> domain age input, or null when the whole block is empty (so an
// untouched Age tab stores no age). Fields hold numbers/strings/undefined;
// normalize nullish to null, parse the string-keyed geological bounds back to
// their rank integer, and trim free-text to a non-empty string (like sibling
// free-text fields). The result is validated by createSampleSchema before it
// leaves the form.
export function toAgeInput(values: AgeFormValues): Age | null {
  const age = {
    numericAgeMin: values.numericAgeMin ?? null,
    numericAgeMax: values.numericAgeMax ?? null,
    numericAgeUnit: values.numericAgeUnit ?? null,
    numericAgeYearsUnit: values.numericAgeYearsUnit ?? null,
    geologicalAgeMin: values.geologicalAgeMin
      ? Number(values.geologicalAgeMin)
      : null,
    geologicalAgeMax: values.geologicalAgeMax
      ? Number(values.geologicalAgeMax)
      : null,
    geologicalUnit: values.geologicalUnit?.trim() || null,
  };
  const isEmpty = Object.values(age).every((value) => value == null);
  return isEmpty ? null : (age as Age);
}
