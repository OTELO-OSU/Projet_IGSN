import { describe, expect, it } from "vitest";

import {
  COLLECTION_METHOD_ROOTS,
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
  const keys = new Set(Object.keys(COLLECTION_METHOD_TREE));

  it.each(COLLECTION_METHOD_ROOTS)(
    "should define the root %s as a node",
    (root) => {
      expect(keys.has(root)).toBe(true);
    },
  );

  it.each(
    Object.entries(COLLECTION_METHOD_TREE).flatMap(([parent, node]) =>
      (node.choices ?? []).map((child) => [parent, child] as const),
    ),
  )("should define the child %s (of %s) as a node", (_parent, child) => {
    expect(keys.has(child)).toBe(true);
  });

  it.each(Object.entries(COLLECTION_METHOD_TREE))(
    "should give %s a non-empty label code",
    (_segment, node) => {
      expect(node.label).toMatch(/^[a-z0-9_]+$/);
    },
  );
});
