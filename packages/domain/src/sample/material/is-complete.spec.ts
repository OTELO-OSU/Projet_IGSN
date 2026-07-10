import { describe, expect, it } from "vitest";

import { isMaterialComplete } from "./is-complete.ts";

describe("isMaterialComplete", () => {
  it.each([
    "rock.igneous",
    "rock.metamorphic",
    "rock.hydrothermal",
    "rock.unknown",
    "mineral",
    "fossil",
    "sediment.exogenous_detritic.clay",
    "sediment.exogenous_detritic.sand.medium_sand",
    "sediment.exogenous_detritic.silt.very_fine_silt",
    "sediment.exogenous_detritic.heterogeneous.other",
    "sediment.volcano_detritic.bomb.pumices",
    "sediment.biogenic.carbonate.boundstone.frame",
    "sediment.biogenic.organic_rich.other",
    "sediment.physico_chemical.precipitates.evaporitic",
    "rock.sedimentary.microbialite",
    "rock.sedimentary.volcaniclastic_rock",
    "rock.sedimentary.hybrid_sedimentary_rock",
    "rock.sedimentary.clastic_sedimentary_rock.rudite",
    "rock.sedimentary.clastic_sedimentary_rock.other",
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.oolite",
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock.limestone",
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock.other",
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.ironstone.banded_iron_formation",
  ])("should be true for the valid stopping point %s", (path) => {
    expect(isMaterialComplete(path)).toBe(true);
  });

  it.each([
    "rock",
    "sediment",
    "sediment.biogenic",
    "sediment.biogenic.carbonate",
    "sediment.biogenic.carbonate.boundstone",
    "rock.sedimentary",
    "rock.sedimentary.clastic_sedimentary_rock",
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock",
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.carbonate_rock",
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.evaporite",
    "rock.sedimentary.biochemical_and_chemical_sedimentary_rock.siliceous_rock",
  ])("should be false for a node that must be refined %s", (path) => {
    expect(isMaterialComplete(path)).toBe(false);
  });
});
