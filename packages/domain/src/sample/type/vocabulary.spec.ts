import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  SAMPLE_TYPE_TREE,
  SAMPLE_TYPES,
  sampleTypeSchema,
} from "./vocabulary.ts";

describe("sampleTypeSchema", () => {
  it("should accept a partial classification (ancestor path)", () => {
    expect(sampleTypeSchema.safeParse("core").success).toBe(true);
  });

  it.each(["", "half_round", "dredge.half_round", "core.unknown", "Core"])(
    "should reject %s",
    (input) => {
      expect(sampleTypeSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("SAMPLE_TYPES", () => {
  it("should only contain lower_snake_case ltree-safe segments", () => {
    for (const path of SAMPLE_TYPES) {
      for (const segment of path.split(".")) {
        expect(segment).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it("should include the parent of every dotted path", () => {
    const orphans = SAMPLE_TYPES.filter(
      (path) =>
        path.includes(".") &&
        !SAMPLE_TYPES.includes(path.split(".").slice(0, -1).join(".")),
    );
    expect(orphans).toEqual([]);
  });

  it("should terminate core.core instead of recursing on the reused core segment", () => {
    expect(SAMPLE_TYPES).toContain("core.core");
    expect(SAMPLE_TYPES).not.toContain("core.core.core");
  });
});

describe("SAMPLE_TYPE_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(unresolvedEntries(SAMPLE_TYPE_TREE, SAMPLE_TYPES)).toEqual([]);
  });
});
