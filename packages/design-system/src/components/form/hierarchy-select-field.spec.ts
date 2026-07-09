import {
  buildHierarchyTree,
  composeHierarchyValue,
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
