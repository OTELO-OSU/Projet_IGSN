import { numericAgeToAnnum } from "./numeric-age-to-annum";

describe("numericAgeToAnnum", () => {
  it.each([
    ["a", 1, 1],
    ["ka", 1, 1_000],
    ["ma", 1, 1_000_000],
    ["ga", 1, 1_000_000_000],
    // Cross-unit equivalence: 500 ka == 0.5 Ma == 500_000 a.
    ["ka", 500, 500_000],
    ["ma", 0.5, 500_000],
  ] as const)("should convert %s %s to %s annum", (unit, value, expected) => {
    expect(numericAgeToAnnum(value, unit)).toBe(expected);
  });
});
