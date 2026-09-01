import { describe, expect, it } from "vitest";

import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";

describe("publishedSampleFrozenField", () => {
  const isFrozen = publishedSampleFrozenField("recent_collection", null);

  it.each([
    "name",
    "typePath[2]",
    "location.startLongitude",
    "location.regionKind",
    "description.collectionDateStart",
    "scientificContext.provenanceStatus",
  ])("freezes %s on a published sample", (field) => {
    expect(isFrozen(field)).toBe(true);
  });

  it.each([
    "texture",
    "collectionMethodPath[0]",
    "location.startVerticalPosition",
    "location.verticalReference",
    "location.localityName",
    "availability",
  ])("leaves %s editable on a published sample", (field) => {
    expect(isFrozen(field)).toBe(false);
  });

  it("freezes the collector name only on the recent-collection branch", () => {
    expect(isFrozen("scientificContext.collectorName")).toBe(true);
    expect(
      publishedSampleFrozenField(
        "historical_specimen",
        null,
      )("scientificContext.collectorName"),
    ).toBe(false);
  });

  it("freezes the collection curator only on the historical-specimen branch", () => {
    expect(isFrozen("scientificContext.collectionCurator")).toBe(false);
    expect(
      publishedSampleFrozenField(
        "historical_specimen",
        null,
      )("scientificContext.collectionCurator"),
    ).toBe(true);
  });

  it("freezes no branch field without a provenance status", () => {
    const withoutBranch = publishedSampleFrozenField(null, null);
    expect(withoutBranch("scientificContext.collectorName")).toBe(false);
    expect(withoutBranch("scientificContext.collectionCurator")).toBe(false);
    expect(withoutBranch("name")).toBe(true);
  });

  describe("material levels", () => {
    it.each([
      ["materialPath[0]", "rock.igneous.plutonic.felsic.granite"],
      ["materialPath[3]", "rock.igneous.plutonic.felsic.granite"],
      ["materialPath[0]", "rock.igneous.plutonic"],
      ["materialPath[3]", "rock.igneous.plutonic"],
    ])("freezes %s on %s, down to the frozen prefix", (field, material) => {
      expect(
        publishedSampleFrozenField("recent_collection", material)(field),
      ).toBe(true);
    });

    it.each(["materialPath[4]", "materialPath[5]"])(
      "leaves %s editable, below the frozen prefix",
      (field) => {
        expect(
          publishedSampleFrozenField(
            "recent_collection",
            "rock.igneous.plutonic.felsic.granite",
          )(field),
        ).toBe(false);
      },
    );
  });
});
