import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  MATERIAL_PATHS,
  MATERIAL_TREE,
  materialPathSchema,
} from "./classification.ts";

describe("materialPathSchema", () => {
  it.each([
    "rock_and_sediment.rock",
    "rock_and_sediment.rock.igneous",
    "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
    "rock_and_sediment.rock.igneous.volcanic.exotic.foidite",
    "rock_and_sediment.rock.igneous.plutonic.exotic.carbonatite",
    "rock_and_sediment.rock.igneous.volcanic.exotic.carbonatite",
    "rock_and_sediment.rock.other",
    "rock_and_sediment.rock.sedimentary.microbialite",
    "rock_and_sediment.rock.sedimentary.clastic_sedimentary_rock.other",
    "rock_and_sediment.rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock.limestone",
    "rock_and_sediment.rock.sedimentary.biochemical_and_chemical_sedimentary_rock.ironstone.banded_iron_formation",
    "rock_and_sediment.sediment.exogenous_detritic.sand.medium_sand",
    "rock_and_sediment.sediment.volcano_detritic.bomb.pumices",
    "rock_and_sediment.sediment.biogenic.carbonate.boundstone.frame",
    "rock_and_sediment.extraterrestrial_rock.micrometeorites",
    "rock_and_sediment.extraterrestrial_rock.returned_samples.lunar_sample.rock",
    "rock_and_sediment.extraterrestrial_rock.returned_samples.asteroid.ryugu",
    "rock_and_sediment.extraterrestrial_rock.meteorites.chondrites.carbonaceous_chondrites.cvred",
    "rock_and_sediment.extraterrestrial_rock.meteorites.chondrites.ordinary_chondrites.h_l",
    "rock_and_sediment.extraterrestrial_rock.meteorites.achondrite_primitive.polymict_ureilite",
    "rock_and_sediment.extraterrestrial_rock.meteorites.achondrites.stony_achondrite.lunar_meteorite.troctolite_anorthosite_melt_breccia",
    "rock_and_sediment.extraterrestrial_rock.meteorites.achondrites.iron_meteorite.iab.main_group",
    "rock_and_sediment.extraterrestrial_rock.meteorites.achondrites.stony_iron_meteorite.pallasite.eagle_station_group",
    "rock_and_sediment.rock.metamorphic.strongly_metamorphosed.gneiss",
    "rock_and_sediment.rock.metamorphic.strongly_metamorphosed.granofels",
    "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.volcanic.mafic.basalt",
    "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_sedimentary_rock.microbialite",
    "rock_and_sediment.rock.hydrothermal.breccia",
    "rock_and_sediment.rock.hydrothermal.carbonate",
    "rock_and_sediment.rock.hydrothermal.sulfide",
    "rock_and_sediment.rock.xenolithic_rock",
    "rock_and_sediment.rock.xenolithic_rock.igneous.plutonic.felsic.granite",
    "rock_and_sediment.rock.xenolithic_rock.metamorphic.strongly_metamorphosed.gneiss",
    "rock_and_sediment.rock.xenolithic_rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.volcanic.mafic.basalt",
  ])("should accept the known path %s", (path) => {
    expect(materialPathSchema.parse(path)).toBe(path);
  });

  it.each([
    "",
    "rock",
    "rock.igneous",
    "rock_and_sediment.rock.unknownchild",
    "gemstone",
    "fossil",
    "Rock",
    "rock_and_sediment.rock.igneous.",
    "rock_and_sediment.rock.sedimentary.nonexistent",
    "rock_and_sediment.rock.sedimentary.clastic_sedimentary_rock.limestone",
    "rock_and_sediment.rock.igneous.volcanic.felsic.granite",
    "rock_and_sediment.rock.igneous.plutonic.mafic.rhyolite",
    "rock_and_sediment.sediment.nonexistent",
    "rock_and_sediment.sediment.exogenous_detritic.silt.medium_sand",
    "rock_and_sediment.extraterrestrial_rock.returned_samples.lunar_sample.rock.igneous",
    "rock_and_sediment.extraterrestrial_rock.ungrouped",
    "rock_and_sediment.extraterrestrial_rock.meteorites.iron_meteorite",
    "rock_and_sediment.rock.metamorphic.nonexistent",
    "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_sedimentary_rock.granite",
    "rock_and_sediment.rock.hydrothermal.nonexistent",
    "rock_and_sediment.rock.hydrothermal.carbonate.grain_supported",
    "rock_and_sediment.rock.xenolithic_rock.sedimentary",
    "rock_and_sediment.rock.xenolithic_rock.xenolithic_rock",
  ])("should reject the unknown or malformed path %s", (path) => {
    expect(materialPathSchema.safeParse(path).success).toBe(false);
  });

  it("should only contain lower_snake_case ltree-safe segments", () => {
    for (const path of MATERIAL_PATHS) {
      for (const segment of path.split(".")) {
        expect(segment).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  it("should include the parent of every dotted path", () => {
    const orphans = MATERIAL_PATHS.filter(
      (path) =>
        path.includes(".") &&
        !MATERIAL_PATHS.includes(path.split(".").slice(0, -1).join(".")),
    );
    expect(orphans).toEqual([]);
  });
});

describe("MATERIAL_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(unresolvedEntries(MATERIAL_TREE, MATERIAL_PATHS)).toEqual([]);
  });
});
