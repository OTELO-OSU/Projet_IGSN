import { type AgeError, ageSchema } from "./model";

const emptyAge = {
  numericAgeMin: null,
  numericAgeMax: null,
  numericAgeUnit: null,
  numericAgeYearsUnit: null,
  geologicalAgeMin: null,
  geologicalAgeMax: null,
  geologicalUnit: null,
};

describe("ageSchema", () => {
  it("should default every field to null on an empty object", () => {
    const result = ageSchema.parse({});
    expect(result).toEqual(emptyAge);
  });

  it("should accept a single numeric age stored in both bounds", () => {
    const result = ageSchema.parse({
      numericAgeMin: 12000,
      numericAgeMax: 12000,
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
    });
    expect(result).toEqual({
      ...emptyAge,
      numericAgeMin: 12000,
      numericAgeMax: 12000,
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
    });
  });

  it("should accept a numeric age range with a shared unit", () => {
    const result = ageSchema.safeParse({
      numericAgeMin: 500,
      numericAgeMax: 2000,
      numericAgeUnit: "ka",
    });
    expect(result).toMatchObject({ success: true });
  });

  it.each([
    { numericAgeMin: 100 },
    { numericAgeMax: 140 },
    { geologicalAgeMin: 8 },
    { geologicalAgeMax: 12 },
  ])("should accept a half-entered range #%#", (input) => {
    expect(ageSchema.safeParse(input)).toMatchObject({ success: true });
  });

  it("should accept a single geological age stored in both bounds", () => {
    const result = ageSchema.safeParse({
      geologicalAgeMin: 8,
      geologicalAgeMax: 8,
    });
    expect(result).toMatchObject({ success: true });
  });

  it("should accept a geological age range", () => {
    const result = ageSchema.safeParse({
      geologicalAgeMin: 8,
      geologicalAgeMax: 12,
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
    { numericAgeMin: 140, numericAgeMax: 100 },
    { numericAgeUnit: "ma" },
    { numericAgeYearsUnit: "bp" },
    {
      numericAgeMin: 120,
      numericAgeMax: 120,
      numericAgeUnit: "ma",
      numericAgeYearsUnit: "bp",
    },
    { numericAgeMin: 1, numericAgeMax: 1, numericAgeUnit: "my" },
    { geologicalAgeMin: 50 },
    { geologicalUnit: "   " },
    { foo: "bar" },
  ])("should reject an invalid age #%#", (input) => {
    const result = ageSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it.each<[Record<string, unknown>, string, AgeError]>([
    [
      { numericAgeMin: 2, numericAgeMax: 1 },
      "numericAgeMax",
      "numeric_range_order",
    ],
    [{ numericAgeUnit: "ma" }, "numericAgeUnit", "numeric_unit_without_value"],
    [
      {
        numericAgeMin: 1,
        numericAgeMax: 1,
        numericAgeUnit: "ma",
        numericAgeYearsUnit: "bp",
      },
      "numericAgeYearsUnit",
      "numeric_years_unit_requires_annum",
    ],
  ])("should emit code %o on field %s", (input, path, code) => {
    const result = ageSchema.safeParse(input);
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path[0] === path);
    expect(issue?.message).toBe(code);
  });
});
