import { describe, expect, it } from "vitest";

import { economicInterestSegment } from "./segment.ts";

describe("economicInterestSegment", () => {
  it.each([
    ["yes", "yes"],
    ["no", "no"],
    ["yes.mineral_and_ore", "mineral_and_ore"],
    ["yes.mineral_and_ore.uranium", "uranium"],
    ["yes.mineral_and_ore.uranium.sandstone", "sandstone"],
    ["yes.hydrocarbon.coal", "coal"],
  ])("should return the last segment of %s", (path, expected) => {
    expect(economicInterestSegment(path)).toBe(expected);
  });
});
