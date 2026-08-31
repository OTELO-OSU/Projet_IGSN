import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  RESOURCE_TYPE_PATHS,
  RESOURCE_TYPE_TREE,
  resourceTypeSchema,
} from "./vocabulary.ts";

describe("resourceTypeSchema", () => {
  it("should accept a partial classification (ancestor path)", () => {
    expect(resourceTypeSchema.safeParse("mineral_and_ore").success).toBe(true);
    expect(
      resourceTypeSchema.safeParse("mineral_and_ore.uranium").success,
    ).toBe(true);
    expect(
      resourceTypeSchema.safeParse("mineral_and_ore.uranium.sandstone").success,
    ).toBe(true);
  });

  it.each([
    "",
    "uranium",
    "non_metallic.uranium",
    "mineral_and_ore.unknown",
    "Mineral_and_ore",
  ])("should reject %s", (input) => {
    expect(resourceTypeSchema.safeParse(input).success).toBe(false);
  });
});

describe("RESOURCE_TYPE_PATHS", () => {
  it("should only contain lower_snake_case ltree-safe segments", () => {
    for (const path of RESOURCE_TYPE_PATHS) {
      for (const segment of path.split(".")) {
        expect(segment).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it("should include the parent of every dotted path", () => {
    const orphans = RESOURCE_TYPE_PATHS.filter(
      (path) =>
        path.includes(".") &&
        !RESOURCE_TYPE_PATHS.includes(path.split(".").slice(0, -1).join(".")),
    );
    expect(orphans).toEqual([]);
  });
});

describe("RESOURCE_TYPE_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(unresolvedEntries(RESOURCE_TYPE_TREE, RESOURCE_TYPE_PATHS)).toEqual(
      [],
    );
  });
});
