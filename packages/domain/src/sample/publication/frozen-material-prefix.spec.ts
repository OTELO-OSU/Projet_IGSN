import { describe, expect, it } from "vitest";

import {
  MATERIAL_PATHS,
  MATERIAL_ROOTS,
  MATERIAL_TREE,
} from "../material/classification.ts";
import { pathChildren } from "../path/children.ts";
import { isOptionalAtOrAbove } from "../path/is-optional.ts";
import { resolvePathNode } from "../path/resolve-node.ts";
import { frozenMaterialPrefix } from "./frozen-material-prefix.ts";

const isEditable = (path: string) =>
  resolvePathNode(MATERIAL_TREE, path)?.node.frozenWhenPublished === false;
const isFrozen = (path: string) => !isEditable(path);

const prefixesOf = (path: string) => {
  const segments = path.split(".");
  return segments.map((_, index) => segments.slice(0, index + 1).join("."));
};

describe("frozenMaterialPrefix", () => {
  it.each([
    [
      "rock_and_sediment.sediment.exogenous_detritic",
      "rock_and_sediment.sediment",
    ],
    [
      "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
      "rock_and_sediment.rock",
    ],
    [
      "rock_and_sediment.extraterrestrial_rock.meteorites.chondrites.carbonaceous_chondrites.ci",
      "rock_and_sediment.extraterrestrial_rock",
    ],
  ])("unlocks %s at %s", (material, expected) => {
    expect(MATERIAL_PATHS).toContain(material);
    expect(frozenMaterialPrefix(material)).toBe(expected);
  });

  it.each([
    "rock_and_sediment.mineral",
    "rock_and_sediment.synthetic_rock_mineral",
  ])("keeps %s wholly frozen", (material) => {
    expect(MATERIAL_PATHS).toContain(material);
    expect(frozenMaterialPrefix(material)).toBeNull();
  });

  it("returns null for a sample with no material", () => {
    expect(frozenMaterialPrefix(null)).toBeNull();
  });

  it("unlocks a path whose deepest segment is not in the tree at its root", () => {
    expect(
      frozenMaterialPrefix(
        "rock_and_sediment.rock.igneous.plutonic.felsic.unlisted",
      ),
    ).toBe("rock_and_sediment.rock");
  });
});

describe("frozenWhenPublished marks in the material tree", () => {
  it("marks neither root nor family editable, so a published sample cannot change what it is", () => {
    const families = MATERIAL_ROOTS.flatMap((root) =>
      pathChildren(MATERIAL_PATHS, root),
    );
    expect([...MATERIAL_ROOTS, ...families].filter(isEditable)).toEqual([]);
  });

  it("gives a wholly frozen path uniformly frozen or uniformly editable children", () => {
    const withMixedChildren = MATERIAL_PATHS.filter((path) => {
      if (!prefixesOf(path).every(isFrozen)) return false;
      const children = pathChildren(MATERIAL_PATHS, path);
      return children.some(isFrozen) && !children.every(isFrozen);
    });
    expect(withMixedChildren).toEqual([]);
  });

  it("unlocks a path exactly where it becomes an optional stop, one frontier for both", () => {
    const disagreeing = MATERIAL_PATHS.filter((path) => {
      const prefix = frozenMaterialPrefix(path);
      const unlocked =
        prefix !== null && prefix.split(".").length < path.split(".").length;
      return unlocked !== isOptionalAtOrAbove(MATERIAL_TREE, path);
    });
    expect(disagreeing).toEqual([]);
  });
});
