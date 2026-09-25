import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import { expandPaths } from "../path/expand-paths.ts";
import {
  fromMineralPath,
  MINERAL_HIERARCHY,
  mineralByMindatId,
  STRUNZ_PATHS,
  strunzPathSchema,
  toMineralPath,
} from "./mineral-hierarchy.ts";
import { MINERALS, STRUNZ_TREE } from "./strunz-classification.ts";

describe("MINERALS", () => {
  it("should give every mineral its own mindat id and Strunz code", () => {
    expect({
      ids: new Set(MINERALS.map((mineral) => mineral.mindatId)).size,
      codes: new Set(MINERALS.map((mineral) => mineral.strunzCode)).size,
    }).toEqual({ ids: MINERALS.length, codes: MINERALS.length });
  });

  it.each([
    [975, "Chrysotile", "9.mindat_975", "9.0.2"],
    [2815, "Muscovite", "9.E.mindat_2815", "9.E.161"],
    [3337, "Quartz", "4.A-E.mindat_3337", "4.D.149"],
    [3821, "Suessite", "1.B.mindat_3821", "1.B.45"],
  ])(
    "should place mindat %i (%s) at %s with the Strunz code %s",
    (mindatId, name, path, strunzCode) => {
      const mineral = mineralByMindatId.get(mindatId);

      expect(
        mineral && {
          name: mineral.name,
          path: toMineralPath(mineral),
          strunzCode: mineral.strunzCode,
        },
      ).toEqual({ name, path, strunzCode });
    },
  );
});

describe("STRUNZ_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(unresolvedEntries(STRUNZ_TREE, STRUNZ_PATHS)).toEqual([]);
  });
});

describe("MINERAL_HIERARCHY", () => {
  it("should reach every mineral exactly once with no duplicate path", () => {
    const paths = expandPaths(MINERAL_HIERARCHY.nodes, MINERAL_HIERARCHY.roots);

    expect(new Set(paths).size).toBe(paths.length);
    expect(
      paths.filter((path) => fromMineralPath(path).mindatId != null).toSorted(),
    ).toEqual(MINERALS.map(toMineralPath).toSorted());
  });
});

describe("strunzPathSchema", () => {
  it.each(["9", "9.E", "2.B-E", "2.HJL-M"])("should accept %s", (path) => {
    expect(strunzPathSchema.safeParse(path).success).toBe(true);
  });

  it.each(["2.C", "2.B", "2.K", "11", "9.Z", "9.E.mindat_2815"])(
    "should reject %s",
    (path) => {
      expect(strunzPathSchema.safeParse(path).success).toBe(false);
    },
  );
});

describe("toMineralPath and fromMineralPath", () => {
  it.each([
    { strunzId: "9", mindatId: null },
    { strunzId: "9.E", mindatId: null },
    { strunzId: "9.E", mindatId: 2815 },
  ])("should round-trip $strunzId with mindat $mindatId", (row) => {
    expect(fromMineralPath(toMineralPath(row))).toEqual(row);
  });
});
