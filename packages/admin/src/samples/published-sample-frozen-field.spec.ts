import { describe, expect, it } from "vitest";

import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";

describe("publishedSampleFrozenField", () => {
  const isFrozen = publishedSampleFrozenField("recent_collection");

  it.each([
    "name",
    "nature",
    "typePath[0]",
    "typePath[2]",
    "materialPath[0]",
    "location.type",
    "location.longitude",
    "location.northLatitude",
    "location.regionKind",
    "location.country",
    "description.collectionDateStart",
    "description.collectionDateEnd",
    "scientificContext.provenanceStatus",
  ])("freezes %s on a published sample", (field) => {
    expect(isFrozen(field)).toBe(true);
  });

  it.each([
    "texture",
    "metamorphicFacies",
    "collectionMethodPath[0]",
    "location.elevationValue",
    "location.elevationMin",
    "location.navigationType",
    "location.localityName",
    "availability",
    "specificName",
    "scientificContext.researchStructure",
  ])("leaves %s editable on a published sample", (field) => {
    expect(isFrozen(field)).toBe(false);
  });

  it("freezes the collector name only on the recent-collection branch", () => {
    expect(isFrozen("scientificContext.collectorName")).toBe(true);
    expect(
      publishedSampleFrozenField("historical_specimen")(
        "scientificContext.collectorName",
      ),
    ).toBe(false);
  });

  it("freezes the collection curator only on the historical-specimen branch", () => {
    expect(isFrozen("scientificContext.collectionCurator")).toBe(false);
    expect(
      publishedSampleFrozenField("historical_specimen")(
        "scientificContext.collectionCurator",
      ),
    ).toBe(true);
  });

  it("freezes no branch field without a provenance status", () => {
    const withoutBranch = publishedSampleFrozenField(null);
    expect(withoutBranch("scientificContext.collectorName")).toBe(false);
    expect(withoutBranch("scientificContext.collectionCurator")).toBe(false);
    expect(withoutBranch("name")).toBe(true);
  });
});
