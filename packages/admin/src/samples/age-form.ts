import type { Age } from "@projet-igsn/domain/sample/age/model";

// The Age block held in the form store as loose strings (numbers are typed into
// text inputs; selects hold "" when empty). Mapped to/from the domain Age here
// so the mapping is pure and unit-testable, away from the component.
export type AgeFormValues = {
  numericAge: string;
  numericAgeUnit: string;
  numericAgeYearsUnit: string;
  numericAgeMin: string;
  numericAgeMinUnit: string;
  numericAgeMinYearsUnit: string;
  numericAgeMax: string;
  numericAgeMaxUnit: string;
  numericAgeMaxYearsUnit: string;
  geologicalAge: string;
  geologicalAgeMin: string;
  geologicalAgeMax: string;
  geologicalUnit: string;
};

export const EMPTY_AGE_FORM_VALUES: AgeFormValues = {
  numericAge: "",
  numericAgeUnit: "",
  numericAgeYearsUnit: "",
  numericAgeMin: "",
  numericAgeMinUnit: "",
  numericAgeMinYearsUnit: "",
  numericAgeMax: "",
  numericAgeMaxUnit: "",
  numericAgeMaxYearsUnit: "",
  geologicalAge: "",
  geologicalAgeMin: "",
  geologicalAgeMax: "",
  geologicalUnit: "",
};

const numberField = (value: number | null): string =>
  value == null ? "" : String(value);

// Persisted age -> loose form values, for edit prefill.
export function ageFormValues(age: Age | null | undefined): AgeFormValues {
  if (!age) return EMPTY_AGE_FORM_VALUES;
  return {
    numericAge: numberField(age.numericAge),
    numericAgeUnit: age.numericAgeUnit ?? "",
    numericAgeYearsUnit: age.numericAgeYearsUnit ?? "",
    numericAgeMin: numberField(age.numericAgeMin),
    numericAgeMinUnit: age.numericAgeMinUnit ?? "",
    numericAgeMinYearsUnit: age.numericAgeMinYearsUnit ?? "",
    numericAgeMax: numberField(age.numericAgeMax),
    numericAgeMaxUnit: age.numericAgeMaxUnit ?? "",
    numericAgeMaxYearsUnit: age.numericAgeMaxYearsUnit ?? "",
    geologicalAge: age.geologicalAge ?? "",
    geologicalAgeMin: age.geologicalAgeMin ?? "",
    geologicalAgeMax: age.geologicalAgeMax ?? "",
    geologicalUnit: age.geologicalUnit ?? "",
  };
}

// A trimmed non-empty numeric string -> number; anything else -> null. A bad
// number (e.g. "12x") becomes null here; the domain schema re-validates on
// publish.
const toNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

// Combobox fields hold undefined (not "") when their selection is cleared, so
// tolerate nullish here.
const toText = (value: string | null | undefined): string | null =>
  value?.trim() || null;

// Loose form values -> domain age input, or null when the whole block is empty
// (so an untouched Age tab stores no age row). The result is validated by
// createSampleSchema before it leaves the form.
export function toAgeInput(values: AgeFormValues): Age | null {
  const age = {
    numericAge: toNumber(values.numericAge),
    numericAgeUnit: toText(values.numericAgeUnit),
    numericAgeYearsUnit: toText(values.numericAgeYearsUnit),
    numericAgeMin: toNumber(values.numericAgeMin),
    numericAgeMinUnit: toText(values.numericAgeMinUnit),
    numericAgeMinYearsUnit: toText(values.numericAgeMinYearsUnit),
    numericAgeMax: toNumber(values.numericAgeMax),
    numericAgeMaxUnit: toText(values.numericAgeMaxUnit),
    numericAgeMaxYearsUnit: toText(values.numericAgeMaxYearsUnit),
    geologicalAge: toText(values.geologicalAge),
    geologicalAgeMin: toText(values.geologicalAgeMin),
    geologicalAgeMax: toText(values.geologicalAgeMax),
    geologicalUnit: toText(values.geologicalUnit),
  };
  const isEmpty = Object.values(age).every((value) => value == null);
  return isEmpty ? null : (age as Age);
}
