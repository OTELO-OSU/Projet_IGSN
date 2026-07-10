import {
  buildHierarchyTree,
  composeHierarchyValue,
  hierarchyLevelItems,
  levelLabel,
  toHierarchyPath,
} from "./hierarchy-select-field.tsx";

describe("buildHierarchyTree", () => {
  it("should nest dot-separated paths under their parent, in order", () => {
    const tree = buildHierarchyTree(["a", "a.x", "a.x.1", "a.y", "b"]);
    expect(tree).toEqual([
      {
        path: "a",
        children: [
          {
            path: "a.x",
            children: [{ path: "a.x.1", children: [] }],
          },
          { path: "a.y", children: [] },
        ],
      },
      { path: "b", children: [] },
    ]);
  });

  it("should return an empty tree for no choices", () => {
    expect(buildHierarchyTree([])).toEqual([]);
  });
});

describe("hierarchyLevelItems", () => {
  const label = (path: string) => path.toUpperCase();
  const nodes = [
    { path: "core.section", children: [] },
    { path: "core.piece", children: [] },
  ];

  it("should list only the child nodes at the root (no parent)", () => {
    expect(hierarchyLevelItems(null, nodes, label, () => true)).toEqual([
      { value: "core.section", label: "CORE.SECTION" },
      { value: "core.piece", label: "CORE.PIECE" },
    ]);
  });

  it("should prepend the parent-itself option when stopping at the parent is allowed", () => {
    const parent = { path: "core", children: nodes };
    expect(hierarchyLevelItems(parent, nodes, label, () => true)).toEqual([
      { value: "core", label: "CORE" },
      { value: "core.section", label: "CORE.SECTION" },
      { value: "core.piece", label: "CORE.PIECE" },
    ]);
  });

  it("should omit the parent-itself option when stopping at the parent is not allowed", () => {
    const parent = { path: "core", children: nodes };
    expect(hierarchyLevelItems(parent, nodes, label, () => false)).toEqual([
      { value: "core.section", label: "CORE.SECTION" },
      { value: "core.piece", label: "CORE.PIECE" },
    ]);
  });

  it("should not synthesize the parent-itself option when a self-child models it", () => {
    // The vocabulary already offers `core.core` as the "stop here" value, so the
    // synthetic `core` option would render the same label twice.
    const selfChildNodes = [
      { path: "core.core", children: [] },
      { path: "core.piece", children: [] },
    ];
    const parent = { path: "core", children: selfChildNodes };
    expect(
      hierarchyLevelItems(parent, selfChildNodes, label, () => true),
    ).toEqual([
      { value: "core.core", label: "CORE.CORE" },
      { value: "core.piece", label: "CORE.PIECE" },
    ]);
  });
});

describe("levelLabel", () => {
  const core = { path: "core", children: [] };

  it("should leave the root level to the caller's marker", () => {
    expect(levelLabel("Type *", null, () => false)).toBe("Type *");
  });

  it("should mark a nested level required when its parent cannot stop there", () => {
    expect(levelLabel("Core", core, () => false)).toBe("Core *");
  });

  it("should not mark a nested level when its parent may stop there", () => {
    expect(levelLabel("Core", core, () => true)).toBe("Core");
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
