import { describe, expect, it } from "vitest";

import {
  MATERIAL_PATHS,
  MATERIAL_ROOTS,
  MATERIAL_TREE,
} from "../material/classification.ts";
import { pathChildren } from "../path/children.ts";
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
      "sediment.exogenous_detritic.gravel.boulder",
      "sediment.exogenous_detritic",
    ],
    ["sediment.exogenous_detritic", "sediment.exogenous_detritic"],
    [
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock.limestone",
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock",
    ],
    ["rock.igneous.plutonic.felsic.granite", "rock.igneous.plutonic.felsic"],
    [
      "rock.metamorphic.strongly_metamorphosed.gneiss",
      "rock.metamorphic.strongly_metamorphosed",
    ],
    [
      "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite",
      "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic",
    ],
    ["sediment.biogenic.carbonate.boundstone.frame", "sediment.biogenic"],
  ])("unlocks %s at %s", (material, expected) => {
    expect(MATERIAL_PATHS).toContain(material);
    expect(frozenMaterialPrefix(material)).toBe(expected);
  });

  it.each([
    "rock.igneous.plutonic",
    "rock.igneous",
    "sediment",
    "mineral",
    "rock.hydrothermal.carbonate",
    "extraterrestrial_rock.returned_samples.lunar_sample.rock",
    "extraterrestrial_rock.meteorites.chondrites.carbonaceous_chondrites.ci",
    "extraterrestrial_rock.meteorites.achondrites.stony_achondrite.lunar_meteorite.basalt",
    "rock.unknown",
    "rock.hydrothermal.breccia",
  ])("keeps %s wholly frozen", (material) => {
    expect(MATERIAL_PATHS).toContain(material);
    expect(frozenMaterialPrefix(material)).toBeNull();
  });

  it("returns null for a sample with no material", () => {
    expect(frozenMaterialPrefix(null)).toBeNull();
  });

  it("freezes a path whose deepest segment is not in the tree", () => {
    expect(
      frozenMaterialPrefix("rock.igneous.plutonic.felsic.unlisted"),
    ).toBeNull();
  });
});

describe("frozenWhenPublished marks in the material tree", () => {
  it("marks no root editable, so a published sample cannot change what it is", () => {
    expect(MATERIAL_ROOTS.filter(isEditable)).toEqual([]);
  });

  it("gives a wholly frozen path uniformly frozen or uniformly editable children", () => {
    const withMixedChildren = MATERIAL_PATHS.filter((path) => {
      if (!prefixesOf(path).every(isFrozen)) return false;
      const children = pathChildren(MATERIAL_PATHS, path);
      return children.some(isFrozen) && !children.every(isFrozen);
    });
    expect(withMixedChildren).toEqual([]);
  });
});
