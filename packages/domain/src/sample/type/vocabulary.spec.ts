import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  SAMPLE_TYPE_TREE,
  SAMPLE_TYPES,
  sampleTypeSchema,
} from "./vocabulary.ts";

describe("sampleTypeSchema", () => {
  it.each(SAMPLE_TYPES)("should accept %s", (type) => {
    expect(sampleTypeSchema.safeParse(type).success).toBe(true);
  });

  it("should accept a partial classification (ancestor path)", () => {
    expect(sampleTypeSchema.safeParse("core").success).toBe(true);
  });

  it.each([
    "",
    "half_round", // sub-value without its parent
    "dredge.half_round", // sub-value under the wrong parent
    "core.unknown",
    "Core",
  ])("should reject %s", (input) => {
    expect(sampleTypeSchema.safeParse(input).success).toBe(false);
  });
});

describe("SAMPLE_TYPES", () => {
  it("should only contain lower_snake_case ltree-safe segments", () => {
    for (const path of SAMPLE_TYPES) {
      for (const segment of path.split(".")) {
        expect(segment).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it.each(SAMPLE_TYPES.filter((path) => path.includes(".")))(
    "should include the parent of %s",
    (path) => {
      const parent = path.split(".").slice(0, -1).join(".");
      expect(SAMPLE_TYPES).toContain(parent);
    },
  );

  it("should terminate core.core instead of recursing on the reused core segment", () => {
    // `core` lists itself as a child; the dotted `core.core` override is a
    // childless leaf, so expansion stops there instead of looping core.core.core.
    expect(SAMPLE_TYPES).toContain("core.core");
    expect(SAMPLE_TYPES).not.toContain("core.core.core");
  });
});

describe("SAMPLE_TYPE_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(unresolvedEntries(SAMPLE_TYPE_TREE, SAMPLE_TYPES)).toEqual([]);
  });
});
