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

  it("should return the weakly and strongly degree nodes under metamorphic", () => {
    expect(materialChildren("rock.metamorphic")).toEqual([
      "rock.metamorphic.weakly_metamorphosed",
      "rock.metamorphic.strongly_metamorphosed",
    ]);
  });

  it("should reuse the igneous branches under meta_igneous_rock", () => {
    const metaIgneous =
      "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock";
    expect(materialChildren(metaIgneous)).toEqual([
      `${metaIgneous}.plutonic`,
      `${metaIgneous}.volcanic`,
    ]);
  });

  it("should reuse the sedimentary children under meta_sedimentary_rock", () => {
    const metaSed =
      "rock.metamorphic.weakly_metamorphosed.meta_sedimentary_rock";
    expect(materialChildren(metaSed)).toEqual([
      `${metaSed}.microbialite`,
      `${metaSed}.clastic_sedimentary_rock`,
      `${metaSed}.biochemical_and_chemical_sedimentary_rock`,
      `${metaSed}.volcaniclastic_rock`,
      `${metaSed}.hybrid_sedimentary_rock`,
    ]);
  });

  it("should return the plutonic and volcanic branches under igneous", () => {
    expect(materialChildren("rock.igneous")).toEqual([
      "rock.igneous.plutonic",
      "rock.igneous.volcanic",
    ]);
  });

  it("should return the five chemistry nodes under a plutonic branch", () => {
    expect(materialChildren("rock.igneous.plutonic")).toEqual([
      "rock.igneous.plutonic.felsic",
      "rock.igneous.plutonic.intermediate",
      "rock.igneous.plutonic.mafic",
      "rock.igneous.plutonic.ultramafic",
      "rock.igneous.plutonic.exotic",
    ]);
  });

  it("should give felsic branch-specific rocks (dotted override)", () => {
    const plutonicFelsic = "rock.igneous.plutonic.felsic";
    expect(materialChildren(plutonicFelsic)).toEqual([
      `${plutonicFelsic}.granite`,
      `${plutonicFelsic}.granodiorite`,
      `${plutonicFelsic}.tonalite`,
      `${plutonicFelsic}.trondhjemite`,
    ]);
    const volcanicFelsic = "rock.igneous.volcanic.felsic";
    expect(materialChildren(volcanicFelsic)).toEqual([
      `${volcanicFelsic}.rhyolite`,
      `${volcanicFelsic}.dacite`,
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

  it("should return the six mineralization types under hydrothermal", () => {
    expect(materialChildren("rock.hydrothermal")).toEqual([
      "rock.hydrothermal.breccia",
      "rock.hydrothermal.carbonate",
      "rock.hydrothermal.oxide",
      "rock.hydrothermal.stockwork",
      "rock.hydrothermal.sulfate",
      "rock.hydrothermal.sulfide",
    ]);
  });

  it("should give the hydrothermal carbonate leaf no children (dotted override)", () => {
    expect(materialChildren("rock.hydrothermal.carbonate")).toEqual([]);
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

  it("should return the direct children of the extraterrestrial root", () => {
    expect(materialChildren("extraterrestrial_rock")).toEqual([
      "extraterrestrial_rock.returned_samples",
      "extraterrestrial_rock.meteorites",
      "extraterrestrial_rock.micrometeorites",
    ]);
  });

  it("should give the lunar rock leaf no children (dotted override of the rock root)", () => {
    expect(
      materialChildren("extraterrestrial_rock.returned_samples.lunar_sample"),
    ).toEqual([
      "extraterrestrial_rock.returned_samples.lunar_sample.rock",
      "extraterrestrial_rock.returned_samples.lunar_sample.soil",
      "extraterrestrial_rock.returned_samples.lunar_sample.core",
    ]);
    expect(
      materialChildren(
        "extraterrestrial_rock.returned_samples.lunar_sample.rock",
      ),
    ).toEqual([]);
  });

  it("should return the direct children of the IAB iron meteorite (Niv.5)", () => {
    const iab =
      "extraterrestrial_rock.meteorites.achondrites.iron_meteorite.iab";
    expect(materialChildren(iab)).toEqual([
      `${iab}.main_group`,
      `${iab}.shl`,
      `${iab}.shh`,
      `${iab}.sll`,
      `${iab}.ungrouped`,
    ]);
  });

  it("should return an empty array for a leaf", () => {
    expect(materialChildren("fossil")).toEqual([]);
  });
});
