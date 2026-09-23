import { describe, expect, it } from "vitest";

import { toCorePath } from "./core-path.ts";

describe("toCorePath", () => {
  it.each([
    ["a mapped field", "existenceStatus", "curation.existenceStatus"],
    ["a mapped nested field", "repository.rightsHolder", "responsibility"],
    ["the index under a mapped list", "manualGroupIds.0", "manualGroups.0"],
    [
      "the longest mapped prefix, up to the first non index",
      "relations.0.identifier",
      "relations.0",
    ],
  ])("should map %s to its Core path", (_rule, path, expected) => {
    expect(toCorePath(path)).toBe(expected);
  });

  it("should return an unmapped path unchanged", () => {
    expect(toCorePath("somethingElse.0")).toBe("somethingElse.0");
  });
});
