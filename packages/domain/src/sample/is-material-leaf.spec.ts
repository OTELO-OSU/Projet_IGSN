import { describe, expect, it } from "vitest";

import { isMaterialLeaf } from "./is-material-leaf.ts";
import { type MaterialPath } from "./material.ts";

describe("isMaterialLeaf", () => {
  it.each(["rock.igneous", "sediment", "fossil"])(
    "should be true for the leaf %s",
    (path) => {
      expect(isMaterialLeaf(path as MaterialPath)).toBe(true);
    },
  );

  it("should be false for the internal node rock", () => {
    expect(isMaterialLeaf("rock" as MaterialPath)).toBe(false);
  });
});
