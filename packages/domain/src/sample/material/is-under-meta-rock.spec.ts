import { describe, expect, it } from "vitest";

import { isUnderMetaRock } from "./is-under-meta-rock.ts";

describe("isUnderMetaRock", () => {
  it.each([
    "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic",
    "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.volcanic.mafic.basalt",
    "rock.xenolithic_rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic",
    "rock.metamorphic.weakly_metamorphosed.meta_sedimentary_rock.clastic_sedimentary_rock.sandstone",
  ])("should hold for %s, a path under a meta rock segment", (path) => {
    expect(isUnderMetaRock(path)).toBe(true);
  });

  it.each([
    "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock",
    "rock.metamorphic.weakly_metamorphosed.meta_sedimentary_rock",
    "meta_igneous_rock",
    "rock.igneous.plutonic",
    "rock.sedimentary.clastic_sedimentary_rock",
  ])("should not hold for %s, which is not under one", (path) => {
    expect(isUnderMetaRock(path)).toBe(false);
  });
});
