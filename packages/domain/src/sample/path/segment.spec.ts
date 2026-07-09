import { describe, expect, it } from "vitest";

import { pathSegment } from "./segment.ts";

describe("pathSegment", () => {
  it.each([
    ["rock", "rock"],
    ["rock.igneous", "igneous"],
    ["coring.piston_corer.giant", "giant"],
  ])("should return the last segment of %s", (path, expected) => {
    expect(pathSegment(path)).toBe(expected);
  });
});
