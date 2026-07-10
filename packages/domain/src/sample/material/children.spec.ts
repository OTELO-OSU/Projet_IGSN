import { describe, expect, it } from "vitest";

import { materialChildren } from "./children.ts";

describe("materialChildren", () => {
  it("should return the root paths when the parent is null", () => {
    expect(materialChildren(null)).toEqual([
      "rock",
      "sediment",
      "mineral",
      "fossil",
      "synthetic_rock_mineral",
      "extraterrestrial_rock",
    ]);
  });

  it("should return only the direct children of a parent", () => {
    expect(materialChildren("rock")).toEqual([
      "rock.igneous",
      "rock.metamorphic",
      "rock.sedimentary",
      "rock.hydrothermal",
      "rock.unknown",
    ]);
  });

  it("should return the direct children of the sedimentary subtree", () => {
    expect(materialChildren("rock.sedimentary")).toEqual([
      "rock.sedimentary.microbialite",
      "rock.sedimentary.clastic_sedimentary_rock",
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock",
      "rock.sedimentary.volcaniclastic_rock",
      "rock.sedimentary.hybrid_sedimentary_rock",
    ]);
  });

  it("should return the direct children of a deep (Niv.4) parent", () => {
    const carbonate =
      "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock";
    expect(materialChildren(carbonate)).toEqual([
      `${carbonate}.limestone`,
      `${carbonate}.dolostone`,
      `${carbonate}.magnesite_stone`,
      `${carbonate}.na_carbonate_rock`,
      `${carbonate}.framestone`,
      `${carbonate}.pseudosparstone`,
      `${carbonate}.sparstone`,
      `${carbonate}.microsparstone`,
      `${carbonate}.microstone`,
      `${carbonate}.other`,
    ]);
  });

  it("should return the direct children of the sediment root", () => {
    expect(materialChildren("sediment")).toEqual([
      "sediment.exogenous_detritic",
      "sediment.volcano_detritic",
      "sediment.biogenic",
      "sediment.physico_chemical",
    ]);
  });

  it("should return the direct children of the biogenic carbonate node", () => {
    const carbonate = "sediment.biogenic.carbonate";
    expect(materialChildren(carbonate)).toEqual([
      `${carbonate}.grain_supported`,
      `${carbonate}.mud_supported`,
      `${carbonate}.boundstone`,
    ]);
  });

  it("should give boundstone children only under carbonate (dotted override)", () => {
    const boundstone = "sediment.biogenic.carbonate.boundstone";
    expect(materialChildren(boundstone)).toEqual([
      `${boundstone}.frame`,
      `${boundstone}.baffle`,
      `${boundstone}.bind`,
    ]);
    expect(
      materialChildren(
        "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.boundstone",
      ),
    ).toEqual([]);
  });

  it("should return an empty array for a leaf", () => {
    expect(materialChildren("fossil")).toEqual([]);
  });
});
