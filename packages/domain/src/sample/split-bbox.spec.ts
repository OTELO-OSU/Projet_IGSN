import { describe, expect, it } from "vitest";

import { splitBbox } from "./split-bbox.ts";

describe("splitBbox", () => {
  it.each([
    { west: -10, south: 40, east: 10, north: 50 },
    { west: -180, south: -90, east: 180, north: 90 },
    { west: 10, south: 40, east: 10, north: 50 },
  ])("should leave %o whole", (bbox) => {
    expect(splitBbox(bbox)).toEqual([bbox]);
  });

  it("should split a box crossing the antimeridian at 180", () => {
    expect(splitBbox({ west: 170, south: 0, east: -170, north: 20 })).toEqual([
      { west: 170, south: 0, east: 180, north: 20 },
      { west: -180, south: 0, east: -170, north: 20 },
    ]);
  });
});
