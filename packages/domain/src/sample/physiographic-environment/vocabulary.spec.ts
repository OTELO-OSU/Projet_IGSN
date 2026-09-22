import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  PHYSIOGRAPHIC_ENVIRONMENT_TREE,
  PHYSIOGRAPHIC_ENVIRONMENTS,
  physiographicEnvironmentSchema,
} from "./vocabulary.ts";

describe("physiographicEnvironmentSchema", () => {
  it.each(["marine", "marine.fjord", "wetland.peat_bog"])(
    "should accept %s",
    (input) => {
      expect(physiographicEnvironmentSchema.safeParse(input).success).toBe(
        true,
      );
    },
  );

  it.each(["fjord", "continental.fjord", "Marine"])(
    "should reject %s",
    (input) => {
      expect(physiographicEnvironmentSchema.safeParse(input).success).toBe(
        false,
      );
    },
  );
});

describe("PHYSIOGRAPHIC_ENVIRONMENTS", () => {
  it("should only contain lower_snake_case ltree-safe segments", () => {
    for (const path of PHYSIOGRAPHIC_ENVIRONMENTS) {
      for (const segment of path.split(".")) {
        expect(segment).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it("should include the parent of every dotted path", () => {
    const orphans = PHYSIOGRAPHIC_ENVIRONMENTS.filter(
      (path) =>
        path.includes(".") &&
        !PHYSIOGRAPHIC_ENVIRONMENTS.includes(
          path.split(".").slice(0, -1).join("."),
        ),
    );
    expect(orphans).toEqual([]);
  });
});

describe("PHYSIOGRAPHIC_ENVIRONMENT_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(
      unresolvedEntries(
        PHYSIOGRAPHIC_ENVIRONMENT_TREE,
        PHYSIOGRAPHIC_ENVIRONMENTS,
      ),
    ).toEqual([]);
  });
});
