import { describe, expect, it } from "vitest";

import { isSampleTypeComplete } from "./is-complete.ts";

describe("isSampleTypeComplete", () => {
  it.each([
    "core",
    "core.piece",
    "dredge",
    "individual_sample",
    "inapplicable",
    "serie_of_sample.core",
  ] as const)("should treat the leaf %s as complete", (type) => {
    expect(isSampleTypeComplete(type)).toBe(true);
  });

  it("should treat a series of samples without its sub-type as incomplete", () => {
    expect(isSampleTypeComplete("serie_of_sample")).toBe(false);
  });
});
