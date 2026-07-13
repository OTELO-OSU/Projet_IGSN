import { type AgeError, ageSchema } from "./model";

const emptyAge = {
  numericAge: null,
  numericAgeUnit: null,
  numericAgeYearsUnit: null,
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
};

describe("ageSchema", () => {
  it("should default every field to null on an empty object", () => {
    const result = ageSchema.parse({});
    expect(result).toEqual(emptyAge);
  });

  it("should accept a single numeric age with unit and years unit", () => {
    const result = ageSchema.parse({
      numericAge: 12000,
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
    });
    expect(result).toEqual({
      ...emptyAge,
      numericAge: 12000,
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
    });
  });

  it("should accept a numeric age range with per-bound units", () => {
    const result = ageSchema.safeParse({
      numericAgeMin: 500,
      numericAgeMinUnit: "ka",
      numericAgeMax: 2,
      numericAgeMaxUnit: "ga",
    });
    expect(result).toMatchObject({ success: true });
  });

  it("should accept a range whose max unit is not set yet (ordered at publish)", () => {
    // 500 (ka) vs 2 (no unit): not comparable yet, so not rejected as inverted.
    const result = ageSchema.safeParse({
      numericAgeMin: 500,
      numericAgeMinUnit: "ka",
      numericAgeMax: 2,
    });
    expect(result).toMatchObject({ success: true });
  });

  // A half-entered range is a valid draft (completeness is a publish blocker,
  // not a schema error), so editing one bound at a time is not rejected.
  it.each([
    { numericAgeMin: 100 },
    { numericAgeMax: 140 },
    { geologicalAgeMin: "ics8" },
    { geologicalAgeMax: "ics12" },
  ])("should accept a half-entered range #%#", (input) => {
    expect(ageSchema.safeParse(input)).toMatchObject({ success: true });
  });

  it("should accept a single geological age", () => {
    const result = ageSchema.safeParse({ geologicalAge: "ics8" });
    expect(result).toMatchObject({ success: true });
  });

  it("should accept a geological age range", () => {
    const result = ageSchema.safeParse({
      geologicalAgeMin: "ics8",
      geologicalAgeMax: "ics12",
    });
    expect(result).toMatchObject({ success: true });
  });

  it("should accept a free-text geological unit", () => {
    const result = ageSchema.safeParse({
      geologicalUnit: "Green Sandstone Fm",
    });
    expect(result).toMatchObject({ success: true });
  });

  it.each([
    // numeric single AND range together
    { numericAge: 120, numericAgeMin: 100, numericAgeMax: 140 },
    // inverted numeric range
    { numericAgeMin: 140, numericAgeMax: 100 },
    // inverted numeric range across units (2 ma > 500 ka)
    {
      numericAgeMin: 2,
      numericAgeMinUnit: "ma",
      numericAgeMax: 500,
      numericAgeMaxUnit: "ka",
    },
    // unit with no numeric value
    { numericAgeUnit: "ma" },
    // years unit with no numeric value
    { numericAgeYearsUnit: "bp" },
    // years unit with a non-annum unit
    { numericAge: 120, numericAgeUnit: "ma", numericAgeYearsUnit: "bp" },
    // geological single AND range together
    {
      geologicalAge: "ics8",
      geologicalAgeMin: "ics8",
      geologicalAgeMax: "ics12",
    },
    // unknown numeric unit
    { numericAge: 1, numericAgeUnit: "my" },
    // unknown geological code
    { geologicalAge: "ics50" },
    // blank geological unit
    { geologicalUnit: "   " },
    // unknown field (strict)
    { foo: "bar" },
  ])("should reject an invalid age #%#", (input) => {
    const result = ageSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  // The issue message is a stable code (not English prose) so the app can
  // translate it. Guards the code the label map keys off.
  it.each<[Record<string, unknown>, string, AgeError]>([
    [
      { numericAge: 1, numericAgeMin: 1, numericAgeMax: 2 },
      "numericAge",
      "numeric_single_and_range",
    ],
    [
      { numericAgeMin: 2, numericAgeMax: 1 },
      "numericAgeMax",
      "numeric_range_order",
    ],
    [{ numericAgeUnit: "ma" }, "numericAgeUnit", "numeric_unit_without_value"],
    [
      { numericAge: 1, numericAgeUnit: "ma", numericAgeYearsUnit: "bp" },
      "numericAgeYearsUnit",
      "numeric_years_unit_requires_annum",
    ],
    [
      {
        geologicalAge: "ics8",
        geologicalAgeMin: "ics8",
        geologicalAgeMax: "ics12",
      },
      "geologicalAge",
      "geological_single_and_range",
    ],
  ])("should emit code %o on field %s", (input, path, code) => {
    const result = ageSchema.safeParse(input);
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path[0] === path);
    expect(issue?.message).toBe(code);
  });
});
