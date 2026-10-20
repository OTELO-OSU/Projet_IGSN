import { describe, expect, it } from "vitest";

import { scatteredSeedSampleName, seedSampleName } from "./seed-sample-name.ts";

describe.each([seedSampleName, scatteredSeedSampleName])("%o", (name) => {
  const names = Array.from({ length: 2500 }, (_, index) => name(index));

  it("should name every row with two letters, three digits and two letters", () => {
    expect(
      names.filter((name) => !/^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(name)),
    ).toEqual([]);
  });

  it("should give every row of a run crossing a thousand rows its own name", () => {
    expect(new Set(names).size).toBe(names.length);
  });
});
