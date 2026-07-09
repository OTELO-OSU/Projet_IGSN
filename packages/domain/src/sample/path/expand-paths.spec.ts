import { describe, expect, it } from "vitest";

import { expandPaths } from "./expand-paths.ts";

describe("expandPaths", () => {
  it("should emit a single path for a leaf root", () => {
    expect(expandPaths({}, ["fossil"])).toEqual(["fossil"]);
  });

  it("should emit each node in root-then-choices order", () => {
    const tree = {
      rock: { choices: ["igneous", "hydrothermal"] },
      hydrothermal: { choices: ["breccia"] },
    };
    expect(expandPaths(tree, ["rock", "mineral"])).toEqual([
      "rock",
      "rock.igneous",
      "rock.hydrothermal",
      "rock.hydrothermal.breccia",
      "mineral",
    ]);
  });

  it("should emit one path per occurrence of a segment reused under several parents", () => {
    const tree = {
      rock: { choices: ["granite", "basalt"] },
      granite: { choices: ["coarse"] },
      basalt: { choices: ["coarse"] },
    };
    expect(expandPaths(tree, ["rock"])).toEqual([
      "rock",
      "rock.granite",
      "rock.granite.coarse",
      "rock.basalt",
      "rock.basalt.coarse",
    ]);
  });

  it("should resolve a node by its longest matching path suffix", () => {
    // Under `b`, segment `c` gets a child `d` (via the dotted `b.c` override);
    // the bare `c` key is a leaf, so `c` outside that context has none.
    const tree = {
      a: { choices: ["b"] },
      b: { choices: ["c"] },
      "b.c": { choices: ["d"] },
      c: {},
      d: {},
    };
    expect(expandPaths(tree, ["a", "c"])).toEqual([
      "a",
      "a.b",
      "a.b.c",
      "a.b.c.d",
      "c",
    ]);
  });

  it("should resolve a segment reused under sibling parents to its own choices (rock.igneous.plutonic/volcanic.felsic)", () => {
    // `felsic` sits under both plutonic and volcanic igneous rock, but each
    // context refines to different rocks. The dotted overrides win over bare
    // `felsic`, so the same segment resolves to different choices by parent.
    const tree = {
      rock: { choices: ["igneous"] },
      igneous: { choices: ["plutonic", "volcanic"] },
      plutonic: { choices: ["felsic"] },
      volcanic: { choices: ["felsic"] },
      "plutonic.felsic": { choices: ["granite"] },
      "volcanic.felsic": { choices: ["rhyolite"] },
      felsic: {},
      granite: {},
      rhyolite: {},
    };
    expect(expandPaths(tree, ["rock"])).toEqual([
      "rock",
      "rock.igneous",
      "rock.igneous.plutonic",
      "rock.igneous.plutonic.felsic",
      "rock.igneous.plutonic.felsic.granite",
      "rock.igneous.volcanic",
      "rock.igneous.volcanic.felsic",
      "rock.igneous.volcanic.felsic.rhyolite",
    ]);
  });

  it("should treat an explicit dotted key as a childless terminal (sample type core.core)", () => {
    const tree = {
      core: { choices: ["core", "piece"] },
      "core.core": {},
      piece: {},
    };
    expect(expandPaths(tree, ["core"])).toEqual([
      "core",
      "core.core",
      "core.piece",
    ]);
  });

  it("should throw when a choice cycles with no terminal override", () => {
    const tree = { core: { choices: ["core"] } };
    expect(() => expandPaths(tree, ["core"])).toThrow(/cycle/);
  });
});
