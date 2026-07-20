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

  it("should assemble a single numeric age stored in both bounds", () => {
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      numericAgeMin: "12000",
      numericAgeMax: "12000",
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
    });
    expect(result).toEqual({
      numericAgeMin: 12000,
      numericAgeMax: 12000,
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
      geologicalAgeMin: null,
      geologicalAgeMax: null,
      geologicalUnit: null,
    });
  });

  it("should parse decimals and trim", () => {
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      numericAgeMin: " 4.2 ",
    });
    expect(result).toMatchObject({ numericAgeMin: 4.2 });
  });

  it("should map a non-numeric value to null", () => {
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      numericAgeMin: "12x",
    });
    expect(result).toBeNull();
  });

  it("should treat an unselected unit combobox (undefined) as empty", () => {
    // ComboboxField stores undefined, not "", when the selection is cleared.
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      numericAgeMin: "5",
      numericAgeMax: "5",
      numericAgeUnit: undefined as unknown as string,
    });
    expect(result).toMatchObject({ numericAgeMin: 5, numericAgeUnit: null });
  });

  it("should keep a geological-only age", () => {
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      geologicalAgeMin: "ics8",
      geologicalAgeMax: "ics8",
    });
    expect(result).toMatchObject({
      geologicalAgeMin: "ics8",
      geologicalAgeMax: "ics8",
      numericAgeMin: null,
    });
  });
});

describe("ageFormValues", () => {
  it("should return empty values for a null age", () => {
    expect(ageFormValues(null)).toEqual(EMPTY_AGE_FORM_VALUES);
  });

  it("should stringify numbers and pass through codes for edit prefill", () => {
    const result = ageFormValues({
      numericAgeMin: 120,
      numericAgeMax: 120,
      numericAgeUnit: "ma",
      numericAgeYearsUnit: null,
      geologicalAgeMin: "ics8",
      geologicalAgeMax: "ics8",
      geologicalUnit: "Green Sandstone Fm",
    });
    expect(result).toEqual({
      ...EMPTY_AGE_FORM_VALUES,
      numericAgeMin: "120",
      numericAgeMax: "120",
      numericAgeUnit: "ma",
      geologicalAgeMin: "ics8",
      geologicalAgeMax: "ics8",
      geologicalUnit: "Green Sandstone Fm",
    });
  });

  it("should round-trip a numeric range through toAgeInput", () => {
    const age = {
      numericAgeMin: 500,
      numericAgeMax: 2000,
      numericAgeUnit: "ka" as const,
      numericAgeYearsUnit: null,
      geologicalAgeMin: null,
      geologicalAgeMax: null,
      geologicalUnit: null,
    };
    expect(toAgeInput(ageFormValues(age))).toEqual(age);
  });
});
