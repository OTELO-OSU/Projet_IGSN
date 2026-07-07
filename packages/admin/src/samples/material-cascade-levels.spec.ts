import { describe, expect, it } from "vitest";

import { materialCascadeLevels } from "./material-cascade-levels.ts";

describe("materialCascadeLevels", () => {
  it("should offer a single root selector when nothing is chosen", () => {
    expect(materialCascadeLevels("")).toEqual([{ parent: null, value: "" }]);
  });

  it("should expose each chosen level plus the next empty selector for an internal node", () => {
    expect(materialCascadeLevels("rock")).toEqual([
      { parent: null, value: "rock" },
      { parent: "rock", value: "" },
    ]);
  });

  it("should stop at a leaf under an internal node with no trailing selector", () => {
    expect(materialCascadeLevels("rock.igneous")).toEqual([
      { parent: null, value: "rock" },
      { parent: "rock", value: "rock.igneous" },
    ]);
  });

  it("should offer a single selector for a leaf root", () => {
    expect(materialCascadeLevels("fossil")).toEqual([
      { parent: null, value: "fossil" },
    ]);
  });
});
