import { describe, expect, it } from "vitest";

import { composeMeasurement } from "./compose-measurement.ts";

describe("composeMeasurement", () => {
  it("should compose a value and its unit unchanged", () => {
    expect(composeMeasurement(10, "cm")).toEqual({ value: 10, unit: "cm" });
  });

  it("should keep a value missing its unit for the schema to reject", () => {
    expect(composeMeasurement(10, undefined)).toEqual({
      value: 10,
      unit: undefined,
    });
  });

  it("should compose nothing without a value, unit left behind or not", () => {
    expect(composeMeasurement(undefined, "kg")).toBeUndefined();
    expect(composeMeasurement(undefined, undefined)).toBeUndefined();
  });
});
