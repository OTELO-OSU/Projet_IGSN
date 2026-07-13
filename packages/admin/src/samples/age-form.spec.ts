import { describe, expect, it } from "vitest";

import {
  ageFormValues,
  EMPTY_AGE_FORM_VALUES,
  toAgeInput,
} from "./age-form.ts";

describe("toAgeInput", () => {
  it("should return null for an untouched block", () => {
    expect(toAgeInput(EMPTY_AGE_FORM_VALUES)).toBeNull();
  });

  it("should assemble a single numeric age", () => {
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      numericAge: "12000",
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
    });
    expect(result).toEqual({
      numericAge: 12000,
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
      numericAgeMin: null,
      numericAgeMinUnit: null,
      numericAgeMinYearsUnit: null,
      numericAgeMax: null,
      numericAgeMaxUnit: null,
      numericAgeMaxYearsUnit: null,
      geologicalAge: null,
      geologicalAgeMin: null,
      geologicalAgeMax: null,
      geologicalUnit: null,
    });
  });

  it("should parse decimals and trim", () => {
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      numericAge: " 4.2 ",
    });
    expect(result).toMatchObject({ numericAge: 4.2 });
  });

  it("should map a non-numeric value to null", () => {
    const result = toAgeInput({ ...EMPTY_AGE_FORM_VALUES, numericAge: "12x" });
    expect(result).toBeNull();
  });

  it("should treat an unselected unit combobox (undefined) as empty", () => {
    // ComboboxField stores undefined, not "", when the selection is cleared.
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      numericAge: "5",
      numericAgeUnit: undefined as unknown as string,
    });
    expect(result).toMatchObject({ numericAge: 5, numericAgeUnit: null });
  });

  it("should keep a geological-only age", () => {
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      geologicalAge: "ics8",
    });
    expect(result).toMatchObject({ geologicalAge: "ics8", numericAge: null });
  });
});

describe("ageFormValues", () => {
  it("should return empty values for a null age", () => {
    expect(ageFormValues(null)).toEqual(EMPTY_AGE_FORM_VALUES);
  });

  it("should stringify numbers and pass through codes for edit prefill", () => {
    const result = ageFormValues({
      numericAge: 120,
      numericAgeUnit: "ma",
      numericAgeYearsUnit: null,
      numericAgeMin: null,
      numericAgeMinUnit: null,
      numericAgeMinYearsUnit: null,
      numericAgeMax: null,
      numericAgeMaxUnit: null,
      numericAgeMaxYearsUnit: null,
      geologicalAge: "ics8",
      geologicalAgeMin: null,
      geologicalAgeMax: null,
      geologicalUnit: "Green Sandstone Fm",
    });
    expect(result).toEqual({
      ...EMPTY_AGE_FORM_VALUES,
      numericAge: "120",
      numericAgeUnit: "ma",
      geologicalAge: "ics8",
      geologicalUnit: "Green Sandstone Fm",
    });
  });

  it("should round-trip a per-bound numeric range through toAgeInput", () => {
    const age = {
      numericAge: null,
      numericAgeUnit: null,
      numericAgeYearsUnit: null,
      numericAgeMin: 500,
      numericAgeMinUnit: "ka" as const,
      numericAgeMinYearsUnit: null,
      numericAgeMax: 2,
      numericAgeMaxUnit: "ga" as const,
      numericAgeMaxYearsUnit: null,
      geologicalAge: null,
      geologicalAgeMin: null,
      geologicalAgeMax: null,
      geologicalUnit: null,
    };
    expect(toAgeInput(ageFormValues(age))).toEqual(age);
  });
});
