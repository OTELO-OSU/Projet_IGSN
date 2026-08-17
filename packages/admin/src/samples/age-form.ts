import type { Age } from "@projet-igsn/domain/sample/age/model";

import { numericUnitSchema } from "@projet-igsn/domain/sample/age/numeric-unit";

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

export const hasNumericAgeValue = (values: AgeFormValues): boolean =>
  values.numericAgeMin != null || values.numericAgeMax != null;

export const numericAgeUnitOf = (values: AgeFormValues): string | null =>
  hasNumericAgeValue(values) ? (values.numericAgeUnit ?? null) : null;

export function toAgeInput(values: AgeFormValues): Age | null {
  const numericAgeUnit = numericAgeUnitOf(values);
  const age = {
    numericAgeMin: values.numericAgeMin ?? null,
    numericAgeMax: values.numericAgeMax ?? null,
    numericAgeUnit,
    numericAgeYearsUnit:
      numericAgeUnit === numericUnitSchema.enum.a
        ? (values.numericAgeYearsUnit ?? null)
        : null,
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
