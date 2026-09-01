import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  GEOMORPHOLOGICAL_ENVIRONMENT_TREE,
  GEOMORPHOLOGICAL_ENVIRONMENTS,
  geomorphologicalEnvironmentSchema,
} from "./vocabulary.ts";

describe("geomorphologicalEnvironmentSchema", () => {
  it.each(["marine_zone", "marine_zone.fjord", "wetland.peat_bog"])(
    "should accept %s",
    (input) => {
      expect(geomorphologicalEnvironmentSchema.safeParse(input).success).toBe(
        true,
      );
    },
  );

  it.each(["", "fjord", "continental_zone.fjord", "atmosphere", "Marine_zone"])(
    "should reject %s",
    (input) => {
      expect(geomorphologicalEnvironmentSchema.safeParse(input).success).toBe(
        false,
      );
    },
  );
});

describe("GEOMORPHOLOGICAL_ENVIRONMENTS", () => {
  it("should only contain lower_snake_case ltree-safe segments", () => {
    for (const path of GEOMORPHOLOGICAL_ENVIRONMENTS) {
      for (const segment of path.split(".")) {
        expect(segment).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it("should include the parent of every dotted path", () => {
    const orphans = GEOMORPHOLOGICAL_ENVIRONMENTS.filter(
      (path) =>
        path.includes(".") &&
        !GEOMORPHOLOGICAL_ENVIRONMENTS.includes(
          path.split(".").slice(0, -1).join("."),
        ),
    );
    expect(orphans).toEqual([]);
  });
});

describe("GEOMORPHOLOGICAL_ENVIRONMENT_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(
      unresolvedEntries(
        GEOMORPHOLOGICAL_ENVIRONMENT_TREE,
        GEOMORPHOLOGICAL_ENVIRONMENTS,
      ),
    ).toEqual([]);
  });
});
