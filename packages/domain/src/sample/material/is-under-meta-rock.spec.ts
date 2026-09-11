import { describe, expect, it } from "vitest";

import { isUnderMetaRock } from "./is-under-meta-rock.ts";

describe("isUnderMetaRock", () => {
  it.each([
    "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic",
    "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.volcanic.mafic.basalt",
    "rock_and_sediment.rock.xenolithic_rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic",
    "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_sedimentary_rock.clastic_sedimentary_rock.sandstone",
  ])("should hold for %s, a path under a meta rock segment", (path) => {
    expect(isUnderMetaRock(path)).toBe(true);
  });

  it.each([
    "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_igneous_rock",
    "rock_and_sediment.rock.metamorphic.weakly_metamorphosed.meta_sedimentary_rock",
    "meta_igneous_rock",
    "rock_and_sediment.rock.igneous.plutonic",
    "rock_and_sediment.rock.sedimentary.clastic_sedimentary_rock",
  ])("should not hold for %s, which is not under one", (path) => {
    expect(isUnderMetaRock(path)).toBe(false);
  });
});
