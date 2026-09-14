import { describe, expect, it } from "vitest";

import { COUNTRIES } from "./country.ts";
import { OCEAN_SEAS } from "./ocean-sea.ts";
import { REGION_TREE } from "./region.ts";

describe("REGION_TREE", () => {
  it("should give no leaf a segment that collides with a root", () => {
    const roots = Object.keys(REGION_TREE);
    expect(
      [...COUNTRIES, ...OCEAN_SEAS].filter((code) => roots.includes(code)),
    ).toEqual([]);
  });
});
