import { describe, expect, it } from "vitest";

import { MATERIAL_PATHS } from "./material.ts";
import { PUBLISHABLE_MATERIAL_TYPES } from "./publishable-material.ts";

describe("PUBLISHABLE_MATERIAL_TYPES", () => {
  it("should only list roots that exist in the vocabulary", () => {
    const roots = new Set(MATERIAL_PATHS.filter((p) => !p.includes(".")));
    for (const type of PUBLISHABLE_MATERIAL_TYPES) {
      expect(roots).toContain(type);
    }
  });
});
