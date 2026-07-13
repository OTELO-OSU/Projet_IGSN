import { describe, expect, it } from "vitest";

import { OCEAN_SEAS, oceanSeaSchema } from "./ocean-sea.ts";

describe("oceanSeaSchema", () => {
  it("should hold 271 unique snake_case codes", () => {
    expect(OCEAN_SEAS).toHaveLength(271);
    expect(new Set(OCEAN_SEAS).size).toBe(271);
    expect(
      OCEAN_SEAS.every((code) => /^[a-z0-9]+(_[a-z0-9]+)*$/.test(code)),
    ).toBe(true);
  });

  it.each([
    "atlantic_ocean",
    "bay_of_bengal",
    "mediterranean_sea",
    "world",
    "unknown",
  ])("should accept the known ocean/sea %s", (code) => {
    expect(oceanSeaSchema.parse(code)).toBe(code);
  });

  it.each(["", "Atlantic Ocean", "atlantic", "foo_sea"])(
    "should reject the unknown ocean/sea %s",
    (code) => {
      expect(oceanSeaSchema.safeParse(code).success).toBe(false);
    },
  );
});
