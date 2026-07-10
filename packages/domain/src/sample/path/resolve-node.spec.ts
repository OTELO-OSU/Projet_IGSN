import { describe, expect, it } from "vitest";

import { resolvePathNode } from "./resolve-node.ts";

const tree = {
  rock: { optional: false },
  igneous: { optional: true },
  // Same segment, different node under a parent: reused-segment override.
  "sediment.igneous": { optional: false },
};

describe("resolvePathNode", () => {
  it("should resolve a bare key by its segment", () => {
    expect(resolvePathNode(tree, "rock")).toEqual({
      key: "rock",
      node: { optional: false },
    });
  });

  it("should resolve a nested path by its last segment when no override exists", () => {
    expect(resolvePathNode(tree, "rock.igneous")).toEqual({
      key: "igneous",
      node: { optional: true },
    });
  });

  it("should prefer the longest matching suffix so a segment can differ by parent", () => {
    expect(resolvePathNode(tree, "sediment.igneous")).toEqual({
      key: "sediment.igneous",
      node: { optional: false },
    });
  });

  it("should return undefined when no suffix matches", () => {
    expect(resolvePathNode(tree, "unknown")).toBeUndefined();
  });
});
