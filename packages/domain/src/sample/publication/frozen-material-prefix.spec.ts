import { describe, expect, it } from "vitest";

import {
  MATERIAL_PATHS,
  MATERIAL_ROOTS,
  MATERIAL_TREE,
} from "../material/classification.ts";
import { pathChildren } from "../path/children.ts";
import { resolvePathNode } from "../path/resolve-node.ts";
import { frozenMaterialPrefix } from "./frozen-material-prefix.ts";

const isFrozen = (path: string) =>
  resolvePathNode(MATERIAL_TREE, path)?.node.frozenWhenPublished === true;

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
    // A published partial path still returns its own prefix, so it can be
    // completed rather than being stuck incomplete.
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
    // Editability follows the reused node: weakly_metamorphosed is frozen at its
    // own level but inherits the plutonic chemistry unlock (ADR 0010, path is
    // the identity).
    [
      "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite",
      "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic",
    ],
    // The frozen head stops at the first editable level, whatever the depth of
    // the stored path: `carbonate` and everything below it stays choosable.
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
    // The `hydrothermal.carbonate` override resolves to a childless leaf, so the
    // marked bare `carbonate` of the sediment subtree does not leak in here.
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
});

describe("frozenWhenPublished marks in the material tree", () => {
  it("freezes a contiguous head of every path", () => {
    const withAFrozenLevelBelowAnEditableOne = MATERIAL_PATHS.filter((path) => {
      const frozen = prefixesOf(path).map(isFrozen);
      const firstEditable = frozen.indexOf(false);
      return firstEditable !== -1 && frozen.slice(firstEditable).includes(true);
    });
    expect(withAFrozenLevelBelowAnEditableOne).toEqual([]);
  });

  it("freezes every root", () => {
    expect(MATERIAL_ROOTS.filter((root) => !isFrozen(root))).toEqual([]);
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
