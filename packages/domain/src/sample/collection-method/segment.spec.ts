import { describe, expect, it } from "vitest";

import { collectionMethodSegment } from "./segment.ts";

describe("collectionMethodSegment", () => {
  it.each([
    ["coring", "coring"],
    ["coring.gravity_corer", "gravity_corer"],
    ["coring.gravity_corer.giant", "giant"],
    ["grab.rov", "rov"],
  ])("should return the last segment of %s", (path, expected) => {
    expect(collectionMethodSegment(path)).toBe(expected);
  });
});
