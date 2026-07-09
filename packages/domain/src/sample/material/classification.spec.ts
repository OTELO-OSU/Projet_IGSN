import { describe, expect, it } from "vitest";

import {
  MATERIAL_PATHS,
  MATERIAL_ROOTS,
  MATERIAL_TREE,
  materialPathSchema,
} from "./classification.ts";

describe("materialPathSchema", () => {
  it.each(["rock", "rock.igneous", "fossil"])(
    "should accept the known path %s",
    (path) => {
      expect(materialPathSchema.parse(path)).toBe(path);
    },
  );

  it.each(["", "rock.unknownchild", "gemstone", "Rock", "rock.igneous."])(
    "should reject the unknown or malformed path %s",
    (path) => {
      expect(materialPathSchema.safeParse(path).success).toBe(false);
    },
  );

  it("should only contain lower_snake_case ltree-safe segments", () => {
    for (const path of MATERIAL_PATHS) {
      for (const segment of path.split(".")) {
        expect(segment).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it.each(MATERIAL_PATHS.filter((path) => path.includes(".")))(
    "should include the parent of %s",
    (path) => {
      const parent = path.split(".").slice(0, -1).join(".");
      expect(MATERIAL_PATHS).toContain(parent);
    },
  );
});

describe("MATERIAL_TREE", () => {
  const keys = new Set(Object.keys(MATERIAL_TREE));

  it.each(MATERIAL_ROOTS)("should define the root %s as a node", (root) => {
    expect(keys.has(root)).toBe(true);
  });

  it.each(
    Object.entries(MATERIAL_TREE).flatMap(([parent, node]) =>
      (node.choices ?? []).map((child) => [parent, child] as const),
    ),
  )("should define the child %s (of %s) as a node", (_parent, child) => {
    expect(keys.has(child)).toBe(true);
  });

  it.each(Object.entries(MATERIAL_TREE))(
    "should give %s a non-empty label code",
    (_segment, node) => {
      expect(node.label).toMatch(/^[a-z0-9_]+$/);
    },
  );
});
