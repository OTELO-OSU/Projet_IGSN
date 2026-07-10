import { describe, expect, it } from "vitest";

import { isPathLeaf } from "./is-leaf.ts";

const paths = ["core", "core.piece", "core.section", "dredge"] as const;

describe("isPathLeaf", () => {
  it.each(["core.piece", "dredge"])("should treat %s as a leaf", (path) => {
    expect(isPathLeaf(paths, path)).toBe(true);
  });

  it("should treat an ancestor path as not a leaf", () => {
    expect(isPathLeaf(paths, "core")).toBe(false);
  });
});
