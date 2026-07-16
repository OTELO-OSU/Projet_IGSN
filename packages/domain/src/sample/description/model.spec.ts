import { describe, expect, it } from "vitest";

import { descriptionSchema } from "./model.ts";

const full = {
  collectionDate: { start: "2014-10-01", end: "2014-10-24" },
  oriented: true,
  orientationExplanation: "Oriented with a compass on the north face",
  openDescription:
    "Coarse-grained, weathered surface, of petrological interest",
  length: { value: 30, unit: "cm" },
  width: { value: 12.5, unit: "cm" },
  thickness: { value: 8, unit: "mm" },
  mass: { value: 1.2, unit: "kg" },
  volume: { value: 350, unit: "cm3" },
};

describe("descriptionSchema", () => {
  it("should accept a full description", () => {
    expect(descriptionSchema.parse(full)).toEqual(full);
  });

  it("should accept an empty description (every part is optional)", () => {
    expect(descriptionSchema.parse({})).toEqual({});
  });

  it("should accept a single collection date as the degenerate range start === end", () => {
    const result = descriptionSchema.safeParse({
      collectionDate: { start: "2014-10-24", end: "2014-10-24" },
    });
    expect(result.success).toBe(true);
  });

  it("should reject a collection date range where start is after end", () => {
    const result = descriptionSchema.safeParse({
      collectionDate: { start: "2014-10-24", end: "2014-10-01" },
    });
    expect(result.success).toBe(false);
  });

  it.each(["24/10/2014", "2014-10-24T10:00:00Z", "2014-13-01", "not a date"])(
    "should reject the non ISO date %s",
    (start) => {
      const result = descriptionSchema.safeParse({
        collectionDate: { start, end: "2014-10-24" },
      });
      expect(result.success).toBe(false);
    },
  );

  it("should reject a collection date missing one end of the range", () => {
    const result = descriptionSchema.safeParse({
      collectionDate: { start: "2014-10-24" },
    });
    expect(result.success).toBe(false);
  });

  it("should accept oriented false without an explanation", () => {
    expect(descriptionSchema.safeParse({ oriented: false }).success).toBe(true);
  });

  it.each([false, null, undefined])(
    "should reject an orientation explanation when oriented is %s",
    (oriented) => {
      const result = descriptionSchema.safeParse({
        oriented,
        orientationExplanation: "Oriented with a compass",
      });
      expect(result.success).toBe(false);
    },
  );

  it.each([
    ["length", "cm"],
    ["width", "m"],
    ["thickness", "mm"],
    ["mass", "kg"],
    ["volume", "ml"],
  ])("should reject a %s value without its unit", (field) => {
    const result = descriptionSchema.safeParse({ [field]: { value: 10 } });
    expect(result.success).toBe(false);
  });

  it.each([
    ["length", "cm"],
    ["mass", "kg"],
    ["volume", "l"],
  ])("should reject a %s unit without a value", (field, unit) => {
    const result = descriptionSchema.safeParse({ [field]: { unit } });
    expect(result.success).toBe(false);
  });

  it.each([
    ["length", "kg"],
    ["mass", "cm"],
    ["volume", "m"],
  ])("should reject a %s with a unit from another dimension", (field, unit) => {
    const result = descriptionSchema.safeParse({
      [field]: { value: 10, unit },
    });
    expect(result.success).toBe(false);
  });

  it.each([0, -1])("should reject the non positive value %d", (value) => {
    const result = descriptionSchema.safeParse({
      mass: { value, unit: "g" },
    });
    expect(result.success).toBe(false);
  });

  it("should reject a blank open description", () => {
    expect(descriptionSchema.safeParse({ openDescription: "  " }).success).toBe(
      false,
    );
  });
});
