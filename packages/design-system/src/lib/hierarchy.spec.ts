import {
  canStopAtPath,
  hierarchyLevelItems,
  hierarchyPathLabel,
  toHierarchyPath,
  type Hierarchy,
} from "./hierarchy.ts";

const hierarchy: Hierarchy = {
  roots: ["rock", "water"],
  nodes: {
    rock: { choices: ["igneous", "sedimentary"] },
    sedimentary: { optional: true, choices: ["sand"] },
    sand: { choices: ["quartz"] },
    water: { optional: true, choices: ["water", "sea"] },
    "water.water": { label: "water_only" },
  },
};

const translate = (code: string) =>
  (code.split(".").at(-1) ?? code).toUpperCase();

describe("canStopAtPath", () => {
  it.each([
    "rock.igneous",
    "rock.sedimentary",
    "rock.sedimentary.sand",
    "water.water",
    "water",
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
    expect(hierarchyPathLabel(hierarchy, "water.water", translate)).toBe(
      "WATER_ONLY",
    );
  });
});

describe("hierarchyLevelItems", () => {
  it.each([
    [null, ["rock", "water"]],
    ["rock", ["rock.igneous", "rock.sedimentary"]],
    ["rock.igneous", []],
    ["water.water", []],
  ] as const)(
    "should compose the children of %j onto its path",
    (parent, expected) => {
      expect(
        hierarchyLevelItems(hierarchy, parent, translate).map(
          (item) => item.value,
        ),
      ).toEqual(expected);
    },
  );

  it("should pair each child path with its translated label", () => {
    expect(hierarchyLevelItems(hierarchy, "water", translate)).toEqual([
      { value: "water.water", label: "WATER_ONLY" },
      { value: "water.sea", label: "SEA" },
    ]);
  });
});

describe("toHierarchyPath", () => {
  it.each([
    [null, []],
    ["a.b.c", ["a", "a.b", "a.b.c"]],
  ] as const)(
    "should split %j into per-level selections",
    (value, expected) => {
      expect(toHierarchyPath(value)).toEqual(expected);
    },
  );
});
