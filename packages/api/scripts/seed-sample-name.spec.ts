import { describe, expect, it } from "vitest";

import { seedSampleName } from "./seed-sample-name.ts";

describe("seedSampleName", () => {
  const names = Array.from({ length: 2500 }, (_, index) =>
    seedSampleName(index),
  );

  it("should name every row with two letters, three digits and two letters", () => {
    expect(
      names.filter((name) => !/^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(name)),
    ).toEqual([]);
  });

  it("should give every row of a run crossing a thousand rows its own name", () => {
    expect(new Set(names).size).toBe(names.length);
  });
});
