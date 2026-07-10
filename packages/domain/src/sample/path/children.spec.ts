import { describe, expect, it } from "vitest";

import { pathChildren } from "./children.ts";

// A flat, ordered dot-path vocabulary with a segment reused under two parents
// ("piece" under both "core" and "core.sub"), to prove children are matched by
// full path, not bare segment.
const paths = [
  "core",
  "core.piece",
  "core.sub",
  "core.sub.piece",
  "dredge",
] as const;

describe("pathChildren", () => {
  it("should return the root paths when the parent is null", () => {
    expect(pathChildren(paths, null)).toEqual(["core", "dredge"]);
  });

  it("should return only the direct children of a parent", () => {
    expect(pathChildren(paths, "core")).toEqual(["core.piece", "core.sub"]);
  });

  it("should match children by full path, not bare segment", () => {
    expect(pathChildren(paths, "core.sub")).toEqual(["core.sub.piece"]);
  });

  it("should return an empty array for a leaf", () => {
    expect(pathChildren(paths, "dredge")).toEqual([]);
  });
});
