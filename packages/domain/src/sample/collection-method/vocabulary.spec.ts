import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  COLLECTION_METHOD_TREE,
  COLLECTION_METHODS,
  collectionMethodSchema,
} from "./vocabulary.ts";

describe("collectionMethodSchema", () => {
  it.each(COLLECTION_METHODS)("should accept %s", (method) => {
    expect(collectionMethodSchema.safeParse(method).success).toBe(true);
  });

  it("should accept a partial classification (ancestor path)", () => {
    expect(collectionMethodSchema.safeParse("coring").success).toBe(true);
    expect(
      collectionMethodSchema.safeParse("coring.gravity_corer").success,
    ).toBe(true);
  });

  it.each([
    "",
    "gravity_corer", // sub-value without its parent
    "dredging.gravity_corer", // sub-value under the wrong parent
    "coring.unknown",
    "Coring",
  ])("should reject %s", (input) => {
    expect(collectionMethodSchema.safeParse(input).success).toBe(false);
  });
});

describe("COLLECTION_METHODS", () => {
  it("should only contain lower_snake_case ltree-safe segments", () => {
    for (const path of COLLECTION_METHODS) {
      for (const segment of path.split(".")) {
        expect(segment).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it.each(COLLECTION_METHODS.filter((path) => path.includes(".")))(
    "should include the parent of %s",
    (path) => {
      const parent = path.split(".").slice(0, -1).join(".");
      expect(COLLECTION_METHODS).toContain(parent);
    },
  );
});

describe("COLLECTION_METHOD_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(
      unresolvedEntries(COLLECTION_METHOD_TREE, COLLECTION_METHODS),
    ).toEqual([]);
  });
});
