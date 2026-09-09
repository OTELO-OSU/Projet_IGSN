import { describe, expect, it } from "vitest";

import { isOptionalAtOrAbove } from "./is-optional.ts";
import { type TreeNode } from "./tree-node.ts";

const nodes: Record<string, TreeNode | undefined> = {
  rock: { choices: ["igneous", "metamorphic"] },
  igneous: { optional: true, choices: ["plutonic"] },
  plutonic: { choices: ["granite"] },
  metamorphic: { choices: ["gneiss"] },
};

describe("isOptionalAtOrAbove", () => {
  it.each([
    "rock.igneous",
    "rock.igneous.plutonic",
    "rock.igneous.plutonic.granite",
  ])(
    "should treat %s as optional, the mark opening its whole subtree",
    (path) => {
      expect(isOptionalAtOrAbove(nodes, path)).toBe(true);
    },
  );

  it.each(["rock", "rock.metamorphic", "rock.metamorphic.gneiss"])(
    "should leave %s outside the frontier, an ancestor or sibling branch being unmarked",
    (path) => {
      expect(isOptionalAtOrAbove(nodes, path)).toBe(false);
    },
  );
});
