import { describe, expect, it } from "vitest";

import { createSampleSchema } from "../sample.ts";
import { toCorePath } from "./core-path.ts";

const NOT_IN_CORE = ["localIdDescription", "attachments"];

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
    [
      "a row field of the mineral classifications",
      "mineralClassifications.2.abundance",
      "extensions.geology.mineralogy.2",
    ],
  ])("should map %s to its Core path", (_rule, path, expected) => {
    expect(toCorePath(path)).toBe(expected);
  });

  it("should return an unmapped path unchanged", () => {
    expect(toCorePath("somethingElse.0")).toBe("somethingElse.0");
  });

  it("should map every createSampleSchema field but the ones Core has no slot for", () => {
    const unmapped = Object.keys(createSampleSchema.shape).filter((field) => {
      const probe = `${field}.leaf`;
      return !NOT_IN_CORE.includes(field) && toCorePath(probe) === probe;
    });
    expect(unmapped).toEqual([]);
  });
});
