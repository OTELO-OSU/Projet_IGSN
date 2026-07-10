import { describe, expect, it } from "vitest";

import { unresolvedEntries } from "./unresolved-entries.ts";

describe("unresolvedEntries", () => {
  const paths = ["rock", "rock.igneous"];

  it("should be empty when every entry resolves from some path", () => {
    const tree = {
      rock: { label: "rock", choices: ["igneous"] },
      "rock.igneous": { label: "igneous" },
    };
    expect(unresolvedEntries(tree, paths)).toEqual([]);
  });

  it("should report the entries no path resolves to (mistyped keys)", () => {
    const tree = {
      rock: { label: "rock", choices: ["igneous"] },
      igneos: { label: "igneous", choices: ["plutonic"] },
    };
    expect(unresolvedEntries(tree, paths)).toEqual(["igneos"]);
  });
});
