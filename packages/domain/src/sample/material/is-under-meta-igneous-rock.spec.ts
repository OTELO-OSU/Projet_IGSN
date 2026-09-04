import { describe, expect, it } from "vitest";

import { isUnderMetaIgneousRock } from "./is-under-meta-igneous-rock.ts";

describe("isUnderMetaIgneousRock", () => {
  it.each([
    "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic",
    "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.volcanic.mafic.basalt",
    "rock.xenolithic_rock.metamorphic.weakly_metamorphosed.meta_igneous_rock.plutonic",
  ])("should hold for %s, a path under a meta_igneous_rock segment", (path) => {
    expect(isUnderMetaIgneousRock(path)).toBe(true);
  });

  it.each([
    "rock.metamorphic.weakly_metamorphosed.meta_igneous_rock",
    "meta_igneous_rock",
    "rock.igneous.plutonic",
  ])("should not hold for %s, which is not under one", (path) => {
    expect(isUnderMetaIgneousRock(path)).toBe(false);
  });
});
