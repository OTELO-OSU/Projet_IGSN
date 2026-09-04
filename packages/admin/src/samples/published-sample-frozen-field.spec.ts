import { describe, expect, it } from "vitest";

import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";

describe("publishedSampleFrozenField", () => {
  const isFrozen = publishedSampleFrozenField("field_sample", null);

  it.each([
    "name",
    "typePath[2]",
    "location.startLongitude",
    "location.regionKind",
    "description.collectionDateStart",
    "scientificContext.provenanceStatus",
    "scientificContext.hostInstitution",
    "scientificContext.collectorOrcid",
  ])("freezes %s on a published sample", (field) => {
    expect(isFrozen(field)).toBe(true);
  });

  it.each([
    "texture",
    "collectionMethodPath[0]",
    "location.startVerticalPosition",
    "location.verticalReference",
    "location.localityName",
    "existenceStatus",
    "availabilityStatus",
    "scientificContext.chiefScientistOrcid",
  ])("leaves %s editable on a published sample", (field) => {
    expect(isFrozen(field)).toBe(false);
  });

  it("freezes the collector name only on the field-sample branch", () => {
    expect(isFrozen("scientificContext.collectorName")).toBe(true);
    expect(
      publishedSampleFrozenField(
        "collection_specimen",
        null,
      )("scientificContext.collectorName"),
    ).toBe(false);
  });

  it("freezes the collection curator only on the collection-specimen branch", () => {
    expect(isFrozen("scientificContext.collectionCurator")).toBe(false);
    expect(
      publishedSampleFrozenField(
        "collection_specimen",
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
      expect(publishedSampleFrozenField("field_sample", material)(field)).toBe(
        true,
      );
    });

    it.each(["materialPath[4]", "materialPath[5]"])(
      "leaves %s editable, below the frozen prefix",
      (field) => {
        expect(
          publishedSampleFrozenField(
            "field_sample",
            "rock.igneous.plutonic.felsic.granite",
          )(field),
        ).toBe(false);
      },
    );
  });
});
