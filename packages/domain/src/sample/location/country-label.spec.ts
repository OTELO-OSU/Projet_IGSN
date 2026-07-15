import { describe, expect, it } from "vitest";

import type { Country } from "./country.ts";

import { countryLabel } from "./country-label.ts";

describe("countryLabel", () => {
  it.each<[Country, string]>([
    ["FR", "France"],
    ["US", "United States"],
    ["GB", "United Kingdom"],
  ])("should localize %s to %s in English", (code, expected) => {
    expect(countryLabel(code, "en")).toBe(expected);
  });

  it("should override the retired AN code to Netherlands Antilles", () => {
    expect(countryLabel("AN", "en")).toBe("Netherlands Antilles");
  });
});
