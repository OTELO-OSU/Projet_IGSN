import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  ECONOMIC_INTEREST_PATHS,
  ECONOMIC_INTEREST_TREE,
  economicInterestSchema,
} from "./vocabulary.ts";

describe("economicInterestSchema", () => {
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
    "mineral_and_ore",
    "yes.uranium",
    "yes.non_metallic.uranium",
    "yes.mineral_and_ore.unknown",
    "no.mineral_and_ore",
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

  it("should include the parent of every dotted path", () => {
    const orphans = ECONOMIC_INTEREST_PATHS.filter(
      (path) =>
        path.includes(".") &&
        !ECONOMIC_INTEREST_PATHS.includes(
          path.split(".").slice(0, -1).join("."),
        ),
    );
    expect(orphans).toEqual([]);
  });
});

describe("ECONOMIC_INTEREST_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(
      unresolvedEntries(ECONOMIC_INTEREST_TREE, ECONOMIC_INTEREST_PATHS),
    ).toEqual([]);
  });
});
