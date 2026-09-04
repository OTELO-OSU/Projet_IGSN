import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  COLLECTION_METHOD_TREE,
  COLLECTION_METHODS,
  collectionMethodSchema,
} from "./vocabulary.ts";

describe("collectionMethodSchema", () => {
  it("should accept a partial classification (ancestor path)", () => {
    expect(collectionMethodSchema.safeParse("coring").success).toBe(true);
    expect(
      collectionMethodSchema.safeParse("coring.gravity_corer").success,
    ).toBe(true);
  });

  it.each([
    "coring.piston_corer.piston_corer",
    "coring.piston_corer.giant",
    "coring.piston_corer.stationary_piston",
    "coring.rock_corer",
    "coring.hollow_auger_corer",
  ])("should accept %s", (input) => {
    expect(collectionMethodSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    "",
    "gravity_corer",
    "dredging.gravity_corer",
    "coring.unknown",
    "Coring",
    "coring.piston_corer.rock_corer",
    "coring.piston_corer.hollow_auger_corer",
    "coring.piston_corer.piston_corer.piston_corer",
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

  it("should include the parent of every dotted path", () => {
    const orphans = COLLECTION_METHODS.filter(
      (path) =>
        path.includes(".") &&
        !COLLECTION_METHODS.includes(path.split(".").slice(0, -1).join(".")),
    );
    expect(orphans).toEqual([]);
  });
});

describe("COLLECTION_METHOD_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(
      unresolvedEntries(COLLECTION_METHOD_TREE, COLLECTION_METHODS),
    ).toEqual([]);
  });
});
