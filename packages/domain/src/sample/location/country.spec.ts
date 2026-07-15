import { describe, expect, it } from "vitest";

import { COUNTRIES, countrySchema } from "./country.ts";

describe("countrySchema", () => {
  it("should hold 240 unique alpha-2 codes", () => {
    expect(COUNTRIES).toHaveLength(240);
    expect(new Set(COUNTRIES).size).toBe(240);
    expect(COUNTRIES.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
  });

  it.each(["FR", "US", "GB", "TW", "XK", "AN"])(
    "should accept the known country %s",
    (code) => {
      expect(countrySchema.parse(code)).toBe(code);
    },
  );

  // "UK" is not an ISO 3166-1 code (GB is); "fr" is the wrong case.
  it.each(["", "fr", "France", "ZZ", "UK"])(
    "should reject the unknown country %s",
    (code) => {
      expect(countrySchema.safeParse(code).success).toBe(false);
    },
  );
});
