import {
  canStopAtPath,
  composeHierarchyValue,
  hierarchyChildren,
  hierarchyLevelItems,
  levelLabel,
  toHierarchyPath,
  type Hierarchy,
} from "./hierarchy-select-field.tsx";

// A fixture exercising every tree feature: a must-refine node (rock, the
// default), an optional node with children (sedimentary), plain leaves, a
// self-child stop (water.water) with its dotted childless override.
const hierarchy: Hierarchy = {
  roots: ["rock", "water"],
  nodes: {
    rock: {
      label: "rock",
      choices: ["igneous", "sedimentary"],
    },
    igneous: { label: "igneous" },
    sedimentary: { label: "sedimentary", optional: true, choices: ["sand"] },
    sand: { label: "sand" },
    water: { label: "water", optional: true, choices: ["water", "sea"] },
    "water.water": { label: "water" },
    sea: { label: "sea" },
  },
};

const label = (path: string) => path.toUpperCase();

describe("hierarchyChildren", () => {
  it("should offer the roots at the top level", () => {
    expect(hierarchyChildren(hierarchy, null)).toEqual(["rock", "water"]);
  });

  it("should compose a node's choices onto its path", () => {
    expect(hierarchyChildren(hierarchy, "rock")).toEqual([
      "rock.igneous",
      "rock.sedimentary",
    ]);
  });

  it("should return no children for a leaf", () => {
    expect(hierarchyChildren(hierarchy, "rock.igneous")).toEqual([]);
  });

  it("should resolve the longest matching suffix, so a dotted override terminates a self-child", () => {
    expect(hierarchyChildren(hierarchy, "water.water")).toEqual([]);
  });
});

describe("canStopAtPath", () => {
  it.each([
    "rock.igneous", // leaf
    "rock.sedimentary", // optional node with children
    "water.water", // dotted override: a childless leaf
    "water", // optional node with children
  ])("should allow stopping at %s", (path) => {
    expect(canStopAtPath(hierarchy, path)).toBe(true);
  });

  it("should forbid stopping at a non-leaf not marked optional", () => {
    expect(canStopAtPath(hierarchy, "rock")).toBe(false);
  });
});

describe("hierarchyLevelItems", () => {
  it("should list only the roots at the top level (no parent)", () => {
    expect(hierarchyLevelItems(hierarchy, null, label)).toEqual([
      { value: "rock", label: "ROCK" },
      { value: "water", label: "WATER" },
    ]);
  });

  it("should prepend the parent-itself option when stopping at the parent is allowed", () => {
    expect(hierarchyLevelItems(hierarchy, "rock.sedimentary", label)).toEqual([
      { value: "rock.sedimentary", label: "ROCK.SEDIMENTARY" },
      { value: "rock.sedimentary.sand", label: "ROCK.SEDIMENTARY.SAND" },
    ]);
  });

  it("should omit the parent-itself option when stopping at the parent is not allowed", () => {
    expect(hierarchyLevelItems(hierarchy, "rock", label)).toEqual([
      { value: "rock.igneous", label: "ROCK.IGNEOUS" },
      { value: "rock.sedimentary", label: "ROCK.SEDIMENTARY" },
    ]);
  });

  it("should not synthesize the parent-itself option when a self-child models it", () => {
    // The vocabulary already offers `water.water` as the "stop here" value, so
    // the synthetic `water` option would render the same label twice.
    expect(hierarchyLevelItems(hierarchy, "water", label)).toEqual([
      { value: "water.water", label: "WATER.WATER" },
      { value: "water.sea", label: "WATER.SEA" },
    ]);
  });
});

describe("levelLabel", () => {
  it("should leave the root level to the caller's marker", () => {
    expect(levelLabel(hierarchy, "Material *", null)).toBe("Material *");
  });

  it("should mark a nested level required when its parent cannot stop there", () => {
    expect(levelLabel(hierarchy, "Rock", "rock")).toBe("Rock *");
  });

  it("should not mark a nested level when its parent may stop there", () => {
    expect(levelLabel(hierarchy, "Sedimentary", "rock.sedimentary")).toBe(
      "Sedimentary",
    );
  });
});

describe("composeHierarchyValue", () => {
  it.each([
    [[], null],
    [["a"], "a"],
    [["a", "a.b"], "a.b"],
    [["a", "a.b", ""], "a.b"], // a reset-but-not-refined deeper level
    [["a", "a"], "a"], // parent-itself option keeps the ancestor
  ] as const)(
    "should take the deepest picked value of %j",
    (path, expected) => {
      expect(composeHierarchyValue([...path])).toBe(expected);
    },
  );
});

describe("toHierarchyPath", () => {
  it.each([
    [null, []],
    ["a", ["a"]],
    ["a.b.c", ["a", "a.b", "a.b.c"]],
  ] as const)(
    "should split %j into per-level selections",
    (value, expected) => {
      expect(toHierarchyPath(value)).toEqual(expected);
    },
  );
});
