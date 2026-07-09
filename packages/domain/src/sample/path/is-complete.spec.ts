import { describe, expect, it } from "vitest";

import { isPathComplete } from "./is-complete.ts";

const paths = ["a", "a.b", "a.b.c", "d"] as const;

describe("isPathComplete", () => {
  it("should treat a leaf as complete whatever the optional policy", () => {
    expect(isPathComplete(paths, "a.b.c", () => false)).toBe(true);
    expect(isPathComplete(paths, "d", () => false)).toBe(true);
  });

  it("should treat every non-leaf as incomplete when nothing is optional (all mandatory)", () => {
    expect(isPathComplete(paths, "a", () => false)).toBe(false);
    expect(isPathComplete(paths, "a.b", () => false)).toBe(false);
  });

  it("should treat every node as complete when all are optional", () => {
    expect(isPathComplete(paths, "a", () => true)).toBe(true);
    expect(isPathComplete(paths, "a.b", () => true)).toBe(true);
  });

  it("should defer to the per-node policy for a mixed tree", () => {
    const isOptional = (path: string) => path === "a";
    expect(isPathComplete(paths, "a", isOptional)).toBe(true);
    expect(isPathComplete(paths, "a.b", isOptional)).toBe(false);
  });
});
