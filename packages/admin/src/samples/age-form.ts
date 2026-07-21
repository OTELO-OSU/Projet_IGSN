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

// Persisted age -> form values, for edit prefill. The domain Age shape already
// fits the form store.
export function ageFormValues(age: Age | null | undefined): AgeFormValues {
  return age ?? EMPTY_AGE_FORM_VALUES;
}

// Form values -> domain age input, or null when the whole block is empty (so an
// untouched Age tab stores no age). Fields already hold numbers/codes/undefined;
// normalize nullish to null and free-text to a trimmed non-empty string (like
// sibling free-text fields). The result is validated by createSampleSchema
// before it leaves the form.
export function toAgeInput(values: AgeFormValues): Age | null {
  const age = {
    numericAgeMin: values.numericAgeMin ?? null,
    numericAgeMax: values.numericAgeMax ?? null,
    numericAgeUnit: values.numericAgeUnit ?? null,
    numericAgeYearsUnit: values.numericAgeYearsUnit ?? null,
    geologicalAgeMin: values.geologicalAgeMin ?? null,
    geologicalAgeMax: values.geologicalAgeMax ?? null,
    geologicalUnit: values.geologicalUnit?.trim() || null,
  };
  const isEmpty = Object.values(age).every((value) => value == null);
  return isEmpty ? null : (age as Age);
}
