import { describe, expect, it } from "vitest";

import { collectionMethodLabelKey } from "./label.ts";

describe("collectionMethodLabelKey", () => {
  it.each([
    ["blasting", "collection_method_blasting"],
    ["coring", "collection_method_coring"],
    ["coring.gravity_corer", "collection_method_gravity_corer"],
    ["coring.gravity_corer.giant", "collection_method_giant"],
  ] as const)("should map %s to the message key %s", (method, key) => {
    expect(collectionMethodLabelKey(method)).toBe(key);
  });
});
