import { describe, expect, it } from "vitest";

import { MATERIAL_PATHS } from "../material/classification.ts";
import { frozenMaterialPrefix } from "./frozen-material-prefix.ts";

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
    // The shallowest unlock wins even when deeper prefixes are marked too: the
    // `carbonate.boundstone` override under biogenic carries the flag as well.
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
  ])("keeps %s wholly frozen", (material) => {
    expect(MATERIAL_PATHS).toContain(material);
    expect(frozenMaterialPrefix(material)).toBeNull();
  });

  it("returns null for a sample with no material", () => {
    expect(frozenMaterialPrefix(null)).toBeNull();
  });
});
