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
    "rock_and_sediment.mineral",
    "rock_and_sediment.rock.igneous",
    "rock_and_sediment.sediment.biogenic",
    "rock_and_sediment.synthetic_rock_mineral",
    "rock_and_sediment.rock.hydrothermal.carbonate",
    "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite",
    "rock_and_sediment.extraterrestrial_rock.meteorites.achondrites.iron_meteorite.iab.main_group",
    "rock_and_sediment.rock.igneous.plutonic.felsic",
    "rock_and_sediment.sediment.biogenic.carbonate.boundstone",
    "rock_and_sediment.extraterrestrial_rock.meteorites.chondrites",
  ])("should treat %s as a valid stopping point", (path) => {
    expect(isMaterialComplete(path)).toBe(true);
  });

  it.each([
    "rock_and_sediment",
    "rock_and_sediment.rock",
    "rock_and_sediment.sediment",
    "rock_and_sediment.extraterrestrial_rock",
  ])("should treat %s as a node that must be refined", (path) => {
    expect(isMaterialComplete(path)).toBe(false);
  });

  it("should mark every child of a family optional and neither root nor family, the third level being the stop frontier", () => {
    const families = MATERIAL_ROOTS.flatMap((root) =>
      pathChildren(MATERIAL_PATHS, root),
    );
    expect([...MATERIAL_ROOTS, ...families].filter(isMarkedOptional)).toEqual(
      [],
    );
    expect(
      families
        .flatMap((family) => pathChildren(MATERIAL_PATHS, family))
        .filter((path) => !isMarkedOptional(path)),
    ).toEqual([]);
  });
});
