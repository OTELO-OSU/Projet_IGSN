import { describe, expect, it } from "vitest";

import { collectionMethodLabel } from "./collection-method-label.ts";

describe("collectionMethodLabel", () => {
  it.each([
    ["coring", "Coring"],
    ["coring.gravity_corer", "GravityCorer"],
    ["manual", "Manual"],
  ] as const)("should return the translated label for %s", (method, label) => {
    expect(collectionMethodLabel(method)).toBe(label);
  });
});
