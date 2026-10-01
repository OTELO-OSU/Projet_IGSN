import { describe, expect, it } from "vitest";

import { nearestRank, seededMix, summarizeByKind } from "./bench-lib.ts";

describe("nearestRank", () => {
  it.each([
    { p: 5, expected: 15 },
    { p: 30, expected: 20 },
    { p: 40, expected: 20 },
    { p: 50, expected: 35 },
    { p: 100, expected: 50 },
  ])(
    "should pick the smallest value with $p% of samples at or below it",
    ({ p, expected }) => {
      expect(nearestRank([15, 20, 35, 40, 50], p)).toBe(expected);
    },
  );
});

describe("seededMix", () => {
  const draw = (seed: number, count: number) => {
    const next = seededMix(seed);
    return Array.from({ length: count }, () => next().query.toString());
  };

  it("should replay the same sequence for the same seed", () => {
    expect(draw(286, 200)).toEqual(draw(286, 200));
  });

  it("should give every request either a search or a regional bbox, never the whole world", () => {
    const next = seededMix(286);
    for (let index = 0; index < 1000; index++) {
      const { query } = next();
      const bbox = query.get("bbox");
      expect(query.has("search")).toBe(bbox === null);
      if (bbox === null) continue;
      const [west, south, east, north] = bbox.split(",").map(Number) as [
        number,
        number,
        number,
        number,
      ];
      expect(east - west).toBeGreaterThanOrEqual(20);
      expect(east - west).toBeLessThanOrEqual(80);
      expect(north - south).toBeGreaterThanOrEqual(20);
      expect(north - south).toBeLessThanOrEqual(60);
      expect(west).toBeGreaterThanOrEqual(-180);
      expect(east).toBeLessThanOrEqual(180);
      expect(south).toBeGreaterThanOrEqual(-90);
      expect(north).toBeLessThanOrEqual(90);
    }
  });
});

describe("summarizeByKind", () => {
  it("should compute each kind's figures from its own requests only", () => {
    const timings = [
      { search: true, ms: 100, error: false },
      { search: true, ms: 300, error: true },
      { search: false, ms: 10, error: false },
      { search: false, ms: 20, error: false },
    ];

    expect(summarizeByKind(timings, 2)).toEqual([
      ["all", 4, "2.00", "20.0", "300.0", "300.0", "300.0", 1],
      ["search", 2, "1.00", "100.0", "300.0", "300.0", "300.0", 1],
      ["map", 2, "1.00", "10.0", "20.0", "20.0", "20.0", 0],
    ]);
  });
});
