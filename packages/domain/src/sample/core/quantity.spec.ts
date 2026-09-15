import { describe, expect, it } from "vitest";

import { fromQuantity, toQuantity } from "./quantity.ts";

describe("toQuantity", () => {
  it.each([
    [
      { value: 1.1, unit: "kbar" },
      { value: 1100, unitCode: "bar" },
    ],
    [
      { value: 2, unit: "gpa" },
      { value: 2e9, unitCode: "Pa" },
    ],
    [
      { value: 10, unit: "ml" },
      { value: 10, unitCode: "mL" },
    ],
    [
      { value: 4, unit: "celsius" },
      { value: 4, unitCode: "Cel" },
    ],
  ])(
    "should convert %o to its UCUM unit code and scale",
    (measurement, expected) => {
      expect(toQuantity(measurement)).toEqual({
        ...expected,
        unitLabel: measurement.unit,
      });
    },
  );
});

describe("fromQuantity", () => {
  it.each([
    { value: 1.1, unit: "kbar" },
    { value: 2, unit: "gpa" },
    { value: 10, unit: "ml" },
  ])("should restore %o from its quantity", (measurement) => {
    expect(fromQuantity(toQuantity(measurement))).toEqual(measurement);
  });
});
