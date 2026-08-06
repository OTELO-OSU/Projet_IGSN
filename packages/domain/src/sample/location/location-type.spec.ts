import { describe, expect, it } from "vitest";

import { locationTypeSchema } from "./location-type.ts";

describe("locationTypeSchema", () => {
  it("should accept a known type", () => {
    expect(locationTypeSchema.parse("point")).toBe("point");
  });

  it("should reject an unknown type", () => {
    expect(locationTypeSchema.safeParse("polygon").success).toBe(false);
  });
});
