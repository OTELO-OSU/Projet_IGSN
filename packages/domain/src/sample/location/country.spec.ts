import { describe, expect, it } from "vitest";

import { countrySchema } from "./country.ts";

describe("countrySchema", () => {
  it("should accept a known country", () => {
    expect(countrySchema.parse("FR")).toBe("FR");
  });

  it("should reject UK, which is not an ISO 3166-1 code (GB is)", () => {
    expect(countrySchema.safeParse("UK").success).toBe(false);
  });
});
