import { describe, expect, it } from "vitest";

import { materialSegment } from "./segment.ts";

describe("materialSegment", () => {
  it.each([
    ["rock", "rock"],
    ["rock.igneous", "igneous"],
    ["rock.hydrothermal.breccia", "breccia"],
  ])("should return the last segment of %s", (path, expected) => {
    expect(materialSegment(path)).toBe(expected);
  });
});
