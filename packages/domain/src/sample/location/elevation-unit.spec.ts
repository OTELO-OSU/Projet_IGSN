import { describe, expect, it } from "vitest";

import { elevationUnitSchema } from "./elevation-unit.ts";

describe("elevationUnitSchema", () => {
  it("should accept a known unit", () => {
    expect(elevationUnitSchema.parse("m")).toBe("m");
  });

  it("should reject an unknown unit", () => {
    expect(elevationUnitSchema.safeParse("cm").success).toBe(false);
  });
});
