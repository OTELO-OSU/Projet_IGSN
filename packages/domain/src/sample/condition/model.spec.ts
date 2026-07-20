import { describe, expect, it } from "vitest";

import { conditionSchema } from "./model.ts";

const full = {
  packaging: "glass_bottle",
  storageConditions: ["temperature_controlled", "light_controlled"],
  temperature: { type: "frozen", measurement: { value: -18, unit: "celsius" } },
  humidity: { type: "controlled", percentage: 40 },
  light: "total_darkness",
  pressure: {
    type: "controlled_gas",
    measurement: { value: 1.2, unit: "bar" },
  },
  specificConditions: "Stored under argon after freeze-drying",
};

describe("conditionSchema", () => {
  it("should accept a full condition", () => {
    expect(conditionSchema.parse(full)).toEqual(full);
  });

  it("should accept an empty condition (every part is optional)", () => {
    expect(conditionSchema.parse({})).toEqual({});
  });

  it("should accept a category without its numeric reading", () => {
    const result = conditionSchema.safeParse({
      temperature: { type: "ambient" },
      humidity: { type: "dry" },
      pressure: { type: "vacuum" },
    });
    expect(result.success).toBe(true);
  });

  it("should reject a temperature measurement missing its unit", () => {
    const result = conditionSchema.safeParse({
      temperature: { type: "frozen", measurement: { value: -18 } },
    });
    expect(result.success).toBe(false);
  });

  it("should reject a numeric reading without its category", () => {
    const result = conditionSchema.safeParse({
      temperature: { measurement: { value: 4, unit: "celsius" } },
    });
    expect(result.success).toBe(false);
  });

  it("should reject a non-positive pressure value", () => {
    const result = conditionSchema.safeParse({
      pressure: { type: "vacuum", measurement: { value: 0, unit: "mbar" } },
    });
    expect(result.success).toBe(false);
  });

  it("should accept no_specific_condition alone", () => {
    const result = conditionSchema.safeParse({
      storageConditions: ["no_specific_condition"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject no_specific_condition combined with another condition", () => {
    const result = conditionSchema.safeParse({
      storageConditions: ["no_specific_condition", "light_controlled"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject duplicate storage conditions", () => {
    const result = conditionSchema.safeParse({
      storageConditions: ["light_controlled", "light_controlled"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject an empty storage condition list", () => {
    const result = conditionSchema.safeParse({ storageConditions: [] });
    expect(result.success).toBe(false);
  });

  it.each([
    { type: "dehydrated", percentage: 9.9 },
    { type: "dry", percentage: 10 },
    { type: "dry", percentage: 30 },
    { type: "moderate", percentage: 30 },
    { type: "moderate", percentage: 50 },
    { type: "humid", percentage: 50.1 },
    { type: "controlled", percentage: 0 },
    { type: "controlled", percentage: 100 },
  ])(
    "should accept a humidity percentage matching its range %o",
    (humidity) => {
      expect(conditionSchema.safeParse({ humidity }).success).toBe(true);
    },
  );

  it.each([
    { type: "dehydrated", percentage: 11 },
    { type: "dehydrated", percentage: 10 },
    { type: "dry", percentage: 9.9 },
    { type: "dry", percentage: 30.1 },
    { type: "moderate", percentage: 29.9 },
    { type: "moderate", percentage: 50.1 },
    { type: "humid", percentage: 50 },
    // Out of the 0-100 bound whatever the range.
    { type: "humid", percentage: 101 },
    { type: "dehydrated", percentage: -1 },
  ])("should reject a humidity percentage outside its range %o", (humidity) => {
    expect(conditionSchema.safeParse({ humidity }).success).toBe(false);
  });

  it("should reject a blank specificConditions", () => {
    const result = conditionSchema.safeParse({ specificConditions: "   " });
    expect(result.success).toBe(false);
  });

  it.each([
    { packaging: "wooden_crate" },
    { storageConditions: ["frozen"] },
    { temperature: { type: "boiling" } },
    { humidity: { type: "soaked" } },
    { light: "strobe" },
    { pressure: { type: "crushing" } },
    {
      temperature: { type: "frozen", measurement: { value: -18, unit: "K°" } },
    },
    { pressure: { type: "vacuum", measurement: { value: 1, unit: "psi" } } },
  ])("should reject the unknown vocabulary code %o", (input) => {
    expect(conditionSchema.safeParse(input).success).toBe(false);
  });
});
