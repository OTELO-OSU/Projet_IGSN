import { describe, expect, it } from "vitest";

import { materialChildren } from "./children.ts";

describe("materialChildren", () => {
  it("should reuse the igneous and metamorphic subtrees under xenolithic_rock", () => {
    expect(materialChildren("rock.xenolithic_rock")).toEqual([
      "rock.xenolithic_rock.igneous",
      "rock.xenolithic_rock.metamorphic",
    ]);
    expect(materialChildren("rock.xenolithic_rock.igneous")).toEqual([
      "rock.xenolithic_rock.igneous.plutonic",
      "rock.xenolithic_rock.igneous.volcanic",
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

  it("should give the hydrothermal carbonate leaf no children (dotted override)", () => {
    expect(materialChildren("rock.hydrothermal.carbonate")).toEqual([]);
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

  it("should return an empty array for a leaf", () => {
    expect(materialChildren("fossil")).toEqual([]);
  });
});
