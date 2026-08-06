import { describe, expect, it } from "vitest";

import { MATERIAL_TREE } from "./classification.ts";
import { isMaterialComplete } from "./is-complete.ts";

describe("isMaterialComplete", () => {
  it.each([
    "mineral",
    "rock.hydrothermal.carbonate",
    "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic.felsic.granite",
    "extraterrestrial_rock.meteorites.achondrites.iron_meteorite.iab.main_group",
  ])("should treat the leaf %s as a valid stopping point", (path) => {
    expect(isMaterialComplete(path)).toBe(true);
  });

  it.each([
    "rock",
    "rock.igneous.plutonic.felsic",
    "sediment.biogenic.carbonate.boundstone",
    "extraterrestrial_rock.meteorites.chondrites",
  ])("should treat %s as a node that must be refined", (path) => {
    expect(isMaterialComplete(path)).toBe(false);
  });

  it("should have no optional node, so completeness is leafhood alone today", () => {
    const optional = Object.entries(MATERIAL_TREE)
      .filter(([, node]) => node.optional === true)
      .map(([key]) => key);
    expect(optional).toEqual([]);
  });
});
