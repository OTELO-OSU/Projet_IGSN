import { describe, expect, it } from "vitest";

import { MATERIAL_PATHS, materialPathSchema } from "./material.ts";

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
