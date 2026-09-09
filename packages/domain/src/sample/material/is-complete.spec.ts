import { describe, expect, it } from "vitest";

import { pathChildren } from "../path/children.ts";
import { resolvePathNode } from "../path/resolve-node.ts";
import {
  MATERIAL_PATHS,
  MATERIAL_ROOTS,
  MATERIAL_TREE,
} from "./classification.ts";
import { isMaterialComplete } from "./is-complete.ts";

const isMarkedOptional = (path: string) =>
  resolvePathNode(MATERIAL_TREE, path)?.node.optional === true;

describe("isMaterialComplete", () => {
  it.each([
    "mineral",
    "rock.hydrothermal.carbonate",
    "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite",
    "extraterrestrial_rock.meteorites.achondrites.iron_meteorite.iab.main_group",
    "rock.igneous.plutonic.felsic",
    "sediment.biogenic.carbonate.boundstone",
    "extraterrestrial_rock.meteorites.chondrites",
  ])("should treat %s as a valid stopping point", (path) => {
    expect(isMaterialComplete(path)).toBe(true);
  });

  it.each(["rock", "sediment", "extraterrestrial_rock"])(
    "should treat the root %s as a node that must be refined",
    (path) => {
      expect(isMaterialComplete(path)).toBe(false);
    },
  );

  it("should mark every child of a root optional and no root, the second level being the stop frontier", () => {
    expect(MATERIAL_ROOTS.filter(isMarkedOptional)).toEqual([]);
    expect(
      MATERIAL_ROOTS.flatMap((root) =>
        pathChildren(MATERIAL_PATHS, root),
      ).filter((path) => !isMarkedOptional(path)),
    ).toEqual([]);
  });
});
