import { describe, expect, it } from "vitest";

import { toCorePath } from "./core-path.ts";

describe("toCorePath", () => {
  it.each([
    ["type", "classification.sampleObjectTypes.0"],
    ["existenceStatus", "curation.existenceStatus"],
    ["description.collectionDate", "production.collection_date_start"],
    ["scientificContext.collectorLastname", "responsibility"],
    ["manualGroupIds.0", "manualGroups.0"],
    ["relations.0.identifier", "relations.0"],
  ])("should map the internal path %s to %s", (path, expected) => {
    expect(toCorePath(path)).toBe(expected);
  });

  it("should return an unmapped path unchanged", () => {
    expect(toCorePath("somethingElse.0")).toBe("somethingElse.0");
  });
});
