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
      numericAgeMin: 12000,
      numericAgeMax: 12000,
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

  it("should normalize a cleared combobox (undefined) to null", () => {
    // ComboboxField stores undefined, not "", when the selection is cleared.
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      numericAgeMin: 5,
      numericAgeMax: 5,
      numericAgeUnit: undefined,
    });
    expect(result).toMatchObject({ numericAgeMin: 5, numericAgeUnit: null });
  });

  it("should parse the string-keyed geological bounds back to their rank", () => {
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      geologicalAgeMin: "8",
      geologicalAgeMax: "8",
    });
    expect(result).toMatchObject({
      geologicalAgeMin: 8,
      geologicalAgeMax: 8,
      numericAgeMin: null,
    });
  });

  it("should drop a blank geological unit to null", () => {
    const result = toAgeInput({
      ...EMPTY_AGE_FORM_VALUES,
      geologicalUnit: "   ",
    });
    expect(result).toBeNull();
  });
});

describe("ageFormValues", () => {
  it("should return empty values for a null age", () => {
    expect(ageFormValues(null)).toEqual(EMPTY_AGE_FORM_VALUES);
  });

  it("should stringify the geological rank bounds for the string-keyed combobox", () => {
    expect(
      ageFormValues({
        numericAgeMin: null,
        numericAgeMax: null,
        numericAgeUnit: null,
        numericAgeYearsUnit: null,
        geologicalAgeMin: 8,
        geologicalAgeMax: 12,
        geologicalUnit: null,
      }),
    ).toMatchObject({ geologicalAgeMin: "8", geologicalAgeMax: "12" });
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
