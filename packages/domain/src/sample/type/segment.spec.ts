import { describe, expect, it } from "vitest";

import { sampleTypeSegment } from "./segment.ts";

describe("sampleTypeSegment", () => {
  it.each([
    ["core", "core"],
    ["core.core", "core"],
    ["core.half_round", "half_round"],
    ["dredge", "dredge"],
  ])("should return the last segment of %s", (path, expected) => {
    expect(sampleTypeSegment(path)).toBe(expected);
  });
});
