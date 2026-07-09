import { describe, expect, it } from "vitest";

import { isMaterialComplete } from "./is-complete.ts";

describe("isMaterialComplete", () => {
  it.each([
    "rock.igneous",
    "rock.metamorphic",
    "rock.sedimentary",
    "rock.hydrothermal",
    "rock.unknown",
    "sediment",
    "mineral",
    "fossil",
  ])("should be true for the valid stopping point %s", (path) => {
    expect(isMaterialComplete(path)).toBe(true);
  });

  it("should be false for a node that must be refined", () => {
    expect(isMaterialComplete("rock")).toBe(false);
  });
});
