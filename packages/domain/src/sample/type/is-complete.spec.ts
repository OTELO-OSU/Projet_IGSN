import { describe, expect, it } from "vitest";

import { isSampleTypeComplete } from "./is-complete.ts";

describe("isSampleTypeComplete", () => {
  it.each([
    "core",
    "core.piece",
    "dredge",
    "individual_sample",
    "inapplicable",
  ] as const)("should treat the leaf %s as complete", (type) => {
    expect(isSampleTypeComplete(type)).toBe(true);
  });
});
