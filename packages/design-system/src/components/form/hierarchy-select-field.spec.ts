import {
  canStopAtPath,
  composeHierarchyValue,
  hierarchyChildren,
  hierarchyLevelItems,
  hierarchyPathLabel,
  levelLabel,
  toHierarchyPath,
  type Hierarchy,
} from "./hierarchy-select-field.tsx";

// A fixture exercising every tree feature: a must-refine node (rock, the
// default), an optional node with children (sedimentary), a self-child stop
// (water.water) with its dotted childless override. Labels are codes, as the
// domain trees carry them. Plain leaves (igneous, sand, sea) have no entry:
// an undefined segment defaults to a childless leaf labelled by its own code.
const hierarchy: Hierarchy = {
  roots: ["rock", "water"],
  nodes: {
    rock: {
      label: "rock",
      choices: ["igneous", "sedimentary"],
    },
    sedimentary: { label: "sedimentary", optional: true, choices: ["sand"] },
    water: { label: "water", optional: true, choices: ["water", "sea"] },
    "water.water": { label: "water_only" },
  },
};

const translate = (code: string) => code.toUpperCase();

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

describe("hierarchyPathLabel", () => {
  it("should render a path's node label code through translate", () => {
    expect(hierarchyPathLabel(hierarchy, "rock.sedimentary", translate)).toBe(
      "SEDIMENTARY",
    );
  });

  it("should label an undefined segment by its own code, not the full path", () => {
    expect(hierarchyPathLabel(hierarchy, "rock.igneous", translate)).toBe(
      "IGNEOUS",
    );
  });

  it("should default to the raw code", () => {
    expect(hierarchyPathLabel(hierarchy, "rock.igneous")).toBe("igneous");
  });

  it("should let a dotted override label its occurrence differently", () => {
    expect(hierarchyPathLabel(hierarchy, "water.water")).toBe("water_only");
  });
});

describe("hierarchyLevelItems", () => {
  it("should list only the roots at the top level (no parent)", () => {
    expect(hierarchyLevelItems(hierarchy, null, translate)).toEqual([
      { value: "rock", label: "ROCK" },
      { value: "water", label: "WATER" },
    ]);
  });

  it("should prepend the parent-itself option when stopping at the parent is allowed", () => {
    expect(
      hierarchyLevelItems(hierarchy, "rock.sedimentary", translate),
    ).toEqual([
      { value: "rock.sedimentary", label: "SEDIMENTARY" },
      { value: "rock.sedimentary.sand", label: "SAND" },
    ]);
  });

  it("should omit the parent-itself option when stopping at the parent is not allowed", () => {
    expect(hierarchyLevelItems(hierarchy, "rock", translate)).toEqual([
      { value: "rock.igneous", label: "IGNEOUS" },
      { value: "rock.sedimentary", label: "SEDIMENTARY" },
    ]);
  });

  it("should not synthesize the parent-itself option when a self-child models it", () => {
    // The vocabulary already offers `water.water` as the "stop here" value, so
    // the synthetic `water` option would render the same label twice.
    expect(hierarchyLevelItems(hierarchy, "water", translate)).toEqual([
      { value: "water.water", label: "WATER_ONLY" },
      { value: "water.sea", label: "SEA" },
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
