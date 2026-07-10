import { describe, expect, it } from "vitest";

import {
  SAMPLE_TYPE_HIERARCHY,
  SAMPLE_TYPE_ROOTS,
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
  const keys = new Set(Object.keys(SAMPLE_TYPE_TREE));

  it.each(SAMPLE_TYPE_ROOTS)("should define the root %s as a node", (root) => {
    expect(keys.has(root)).toBe(true);
  });

  it.each(
    Object.entries(SAMPLE_TYPE_TREE).flatMap(([parent, node]) =>
      (node.choices ?? []).map((child) => [parent, child] as const),
    ),
  )("should define the child %s (of %s) as a node", (_parent, child) => {
    expect(keys.has(child)).toBe(true);
  });

  it.each(Object.entries(SAMPLE_TYPE_TREE))(
    "should give %s a non-empty label code",
    (_segment, node) => {
      expect(node.label).toMatch(/^[a-z0-9_]+$/);
    },
  );
});

describe("SAMPLE_TYPE_HIERARCHY", () => {
  it("should bundle the existing roots and nodes", () => {
    expect(SAMPLE_TYPE_HIERARCHY).toEqual({
      roots: SAMPLE_TYPE_ROOTS,
      nodes: SAMPLE_TYPE_TREE,
    });
  });
});
