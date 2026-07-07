import { describe, expect, it } from "vitest";

import { isSampleTypeLeaf } from "./is-sample-type-leaf.ts";

describe("isSampleTypeLeaf", () => {
  it.each([
    "core.piece",
    "dredge",
    "individual_sample",
    "inapplicable",
  ] as const)("should treat %s as a leaf", (type) => {
    expect(isSampleTypeLeaf(type)).toBe(true);
  });

  it("should treat an ancestor path as not a leaf", () => {
    expect(isSampleTypeLeaf("core")).toBe(false);
  });
});
