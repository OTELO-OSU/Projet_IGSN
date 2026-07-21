import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  ECONOMIC_INTEREST_PATHS,
  ECONOMIC_INTEREST_TREE,
  economicInterestSchema,
} from "./vocabulary.ts";

describe("economicInterestSchema", () => {
  it.each(ECONOMIC_INTEREST_PATHS)("should accept %s", (path) => {
    expect(economicInterestSchema.safeParse(path).success).toBe(true);
  });

  it.each(["yes", "no", "unknown"])("should accept the %s answer", (answer) => {
    expect(economicInterestSchema.safeParse(answer).success).toBe(true);
  });

  it("should accept a partial classification (ancestor path)", () => {
    expect(
      economicInterestSchema.safeParse("yes.mineral_and_ore").success,
    ).toBe(true);
    expect(
      economicInterestSchema.safeParse("yes.mineral_and_ore.uranium").success,
    ).toBe(true);
  });

  it("should accept the deep uranium deposit type path", () => {
    expect(
      economicInterestSchema.safeParse("yes.mineral_and_ore.uranium.sandstone")
        .success,
    ).toBe(true);
  });

  it.each([
    "",
    "mineral_and_ore", // resource type without its yes answer
    "yes.uranium", // sub-value without its full ancestry
    "yes.non_metallic.uranium", // sub-value under the wrong parent
    "yes.mineral_and_ore.unknown",
    "no.mineral_and_ore", // no answer has no children
    "Yes",
  ])("should reject %s", (input) => {
    expect(economicInterestSchema.safeParse(input).success).toBe(false);
  });
});

describe("ECONOMIC_INTEREST_PATHS", () => {
  it("should only contain lower_snake_case ltree-safe segments", () => {
    for (const path of ECONOMIC_INTEREST_PATHS) {
      for (const segment of path.split(".")) {
        expect(segment).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it.each(ECONOMIC_INTEREST_PATHS.filter((path) => path.includes(".")))(
    "should include the parent of %s",
    (path) => {
      const parent = path.split(".").slice(0, -1).join(".");
      expect(ECONOMIC_INTEREST_PATHS).toContain(parent);
    },
  );
});

describe("ECONOMIC_INTEREST_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(
      unresolvedEntries(ECONOMIC_INTEREST_TREE, ECONOMIC_INTEREST_PATHS),
    ).toEqual([]);
  });
});
