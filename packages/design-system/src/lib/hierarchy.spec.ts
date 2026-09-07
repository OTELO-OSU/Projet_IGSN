import {
  canStopAtPath,
  composeHierarchyValue,
  hierarchyChildren,
  hierarchyLevelItems,
  hierarchyPathLabel,
  toHierarchyPath,
  type Hierarchy,
} from "./hierarchy.ts";

// A fixture exercising every tree feature: a must-refine node (rock, the
// default), an optional node with children (sedimentary), a self-child stop
// (water.water) with its dotted childless override. Plain leaves (igneous,
// sand, sea) have no entry: an undefined segment defaults to a childless leaf.
// A node's label code defaults to its own segment; only the water.water
// override relabels its occurrence (water_only).
const hierarchy: Hierarchy = {
  roots: ["rock", "water"],
  nodes: {
    rock: { choices: ["igneous", "sedimentary"], childLabel: "rock_kind" },
    sedimentary: { optional: true, choices: ["sand"] },
    water: { optional: true, choices: ["water", "sea"] },
    "water.water": { label: "water_only" },
  },
};

const translate = (code: string) =>
  (code.split(".").at(-1) ?? code).toUpperCase();

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
  it("should render a path's label code through translate", () => {
    expect(hierarchyPathLabel(hierarchy, "rock.sedimentary", translate)).toBe(
      "SEDIMENTARY",
    );
  });

  it("should let a dotted override relabel its occurrence's last segment", () => {
    expect(hierarchyPathLabel(hierarchy, "water.water")).toBe(
      "water.water_only",
    );
  });
});

describe("label codes", () => {
  const labelled: Hierarchy = {
    roots: ["a"],
    nodes: {
      a: { choices: ["b"] },
      "a.b": { label: "b", childLabel: "kids" },
    },
  };

  it.each([
    ["a path label", hierarchyPathLabel, "a.b", "a.b"],
    ["a root path label", hierarchyPathLabel, "a", "a"],
  ] as const)(
    "should give translate the full path for %s",
    (_case, label, path, expected) => {
      expect(label(labelled, path, (code) => code)).toBe(expected);
    },
  );
});

describe("hierarchyLevelItems", () => {
  it("should list only the roots at the top level (no parent)", () => {
    expect(hierarchyLevelItems(hierarchy, null, translate)).toEqual([
      { value: "rock", label: "ROCK" },
      { value: "water", label: "WATER" },
    ]);
  });

  it("should list only the children, never a synthetic parent-itself stop option", () => {
    // Stopping at the optional `sedimentary` is done by leaving this level
    // blank, so the level offers its children alone and never echoes the parent.
    expect(
      hierarchyLevelItems(hierarchy, "rock.sedimentary", translate),
    ).toEqual([{ value: "rock.sedimentary.sand", label: "SAND" }]);
  });

  it("should list the children of a must-refine parent", () => {
    expect(hierarchyLevelItems(hierarchy, "rock", translate)).toEqual([
      { value: "rock.igneous", label: "IGNEOUS" },
      { value: "rock.sedimentary", label: "SEDIMENTARY" },
    ]);
  });

  it("should render an explicit self-child stop value like any other child", () => {
    // The vocabulary models "stop here" as the `water.water` self-child, so it
    // renders on its own (relabelled by its dotted override), no synthetic echo.
    expect(hierarchyLevelItems(hierarchy, "water", translate)).toEqual([
      { value: "water.water", label: "WATER_ONLY" },
      { value: "water.sea", label: "SEA" },
    ]);
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
