import { describe, expect, it } from "vitest";

import type { OceanSea } from "./ocean-sea.ts";

import { oceanSeaName } from "./ocean-sea-label.ts";

describe("oceanSeaName", () => {
  it.each<[OceanSea, string]>([
    ["atlantic_ocean", "Atlantic Ocean"],
    ["mediterranean_sea", "Mediterranean Sea"],
    // Casing that a de-slug could not recover, so the name map is required.
    ["ijsselmeer", "IJsselmeer"],
  ])("should map %s to %s", (code, expected) => {
    expect(oceanSeaName(code)).toBe(expected);
  });
});
