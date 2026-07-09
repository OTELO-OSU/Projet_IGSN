import { describe, expect, it } from "vitest";

import { isSampleTypeComplete } from "./is-complete.ts";

describe("isSampleTypeComplete", () => {
  it.each([
    "core.piece",
    "core.core", // dotted override key: a childless leaf, so a valid stop
    "dredge",
    "individual_sample",
    "inapplicable",
  ] as const)("should treat the leaf %s as complete", (type) => {
    expect(isSampleTypeComplete(type)).toBe(true);
  });

  it("should treat an ancestor path as incomplete", () => {
    expect(isSampleTypeComplete("core")).toBe(false);
  });
});
