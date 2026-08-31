import { describe, expect, it } from "vitest";

import { hasEconomicInterest } from "./has-economic-interest.ts";

describe("hasEconomicInterest", () => {
  it("should not report economic interest when no field is filled", () => {
    expect(hasEconomicInterest({})).toBe(false);
  });

  it.each([
    { resourceType: "mineral_and_ore.uranium" },
    { economicInterestElements: ["U"] },
    { economicResourceTypePrecision: "pitchblende" },
    { economicDepositName: "Cigar Lake" },
    { economicDepositDescription: "unconformity-related" },
  ])("should report economic interest from %o alone", (value) => {
    expect(hasEconomicInterest(value)).toBe(true);
  });

  it("should not report economic interest from blank or empty fields", () => {
    expect(
      hasEconomicInterest({
        resourceType: null,
        economicInterestElements: [],
        economicResourceTypePrecision: "",
        economicDepositName: undefined,
        economicDepositDescription: "",
      }),
    ).toBe(false);
  });
});
