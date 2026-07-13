import { describe, expect, it } from "vitest";

import { elevationUnitSchema } from "./elevation-unit.ts";

describe("elevationUnitSchema", () => {
  it.each(["m", "km"])("should accept the known unit %s", (code) => {
    expect(elevationUnitSchema.parse(code)).toBe(code);
  });

  it.each(["", "M", "meter", "cm"])(
    "should reject the unknown unit %s",
    (code) => {
      expect(elevationUnitSchema.safeParse(code).success).toBe(false);
    },
  );
});
