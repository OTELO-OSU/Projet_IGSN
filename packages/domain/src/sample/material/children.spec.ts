import { describe, expect, it } from "vitest";

import { materialChildren } from "./children.ts";

describe("materialChildren", () => {
  it("should return the root paths when the parent is null", () => {
    expect(materialChildren(null)).toEqual([
      "rock",
      "sediment",
      "mineral",
      "fossil",
      "synthetic_rock_mineral",
      "extraterrestrial_rock",
    ]);
  });

  it("should return only the direct children of a parent", () => {
    expect(materialChildren("rock")).toEqual([
      "rock.igneous",
      "rock.metamorphic",
      "rock.sedimentary",
      "rock.hydrothermal",
      "rock.unknown",
    ]);
  });

  it("should return an empty array for a leaf", () => {
    expect(materialChildren("fossil")).toEqual([]);
  });
});
