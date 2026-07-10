import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "../../../test/unresolved-entries.ts";
import {
  MATERIAL_PATHS,
  MATERIAL_TREE,
  materialPathSchema,
} from "./classification.ts";

describe("materialPathSchema", () => {
  it.each([
    "rock",
    "rock.igneous",
    "rock.igneous.plutonic.felsic.granite",
    "rock.igneous.volcanic.exotic.foidite",
    "rock.igneous.plutonic.exotic.carbonatite",
    "rock.igneous.volcanic.exotic.carbonatite",
    "fossil",
    "rock.sedimentary.microbialite",
    "rock.sedimentary.clastic_sedimentary_rock.other",
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock.limestone",
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.ironstone.banded_iron_formation",
    "sediment.exogenous_detritic.sand.medium_sand",
    "sediment.volcano_detritic.bomb.pumices",
    "sediment.biogenic.carbonate.boundstone.frame",
    "extraterrestrial_rock.micrometeorites",
    "extraterrestrial_rock.returned_samples.lunar_sample.rock",
    "extraterrestrial_rock.returned_samples.asteroid.ryugu",
    "extraterrestrial_rock.meteorites.chondrites.carbonaceous_chondrites.cvred",
    "extraterrestrial_rock.meteorites.chondrites.ordinary_chondrites.h_l",
    "extraterrestrial_rock.meteorites.achondrite_primitive.polymict_ureilite",
    "extraterrestrial_rock.meteorites.achondrites.stony_achondrite.lunar_meteorite.troctolite_anorthosite_melt_breccia",
    "extraterrestrial_rock.meteorites.achondrites.iron_meteorite.iab.main_group",
    "extraterrestrial_rock.meteorites.achondrites.stony_iron_meteorite.pallasite.eagle_station_group",
  ])("should accept the known path %s", (path) => {
    expect(materialPathSchema.parse(path)).toBe(path);
  });

  it.each([
    "",
    "rock.unknownchild",
    "gemstone",
    "Rock",
    "rock.igneous.",
    "rock.sedimentary.nonexistent",
    "rock.sedimentary.clastic_sedimentary_rock.limestone",
    "rock.igneous.volcanic.felsic.granite",
    "rock.igneous.plutonic.mafic.rhyolite",
    "sediment.nonexistent",
    "sediment.exogenous_detritic.silt.medium_sand",
    // The lunar rock leaf is a dotted override: bare `rock`'s children must not
    // expand under it, and igneous only lives under the rock root.
    "extraterrestrial_rock.returned_samples.lunar_sample.rock.igneous",
    "extraterrestrial_rock.ungrouped",
    "extraterrestrial_rock.meteorites.iron_meteorite",
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

  it.each(MATERIAL_PATHS.filter((path) => path.includes(".")))(
    "should include the parent of %s",
    (path) => {
      const parent = path.split(".").slice(0, -1).join(".");
      expect(MATERIAL_PATHS).toContain(parent);
    },
  );
});

describe("MATERIAL_TREE", () => {
  it("should resolve every entry from some path", () => {
    expect(unresolvedEntries(MATERIAL_TREE, MATERIAL_PATHS)).toEqual([]);
  });
});
