import { describe, expect, it } from "vitest";

import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";

describe("publishedSampleFrozenField", () => {
  const isFrozen = publishedSampleFrozenField("field_sample", null);

  it.each([
    "manualGroupIds",
    "scientificContext.provenanceStatus",
    "syntheticDetails.operatorName",
  ])("freezes %s on a published sample", (field) => {
    expect(isFrozen(field)).toBe(true);
  });

  it.each([
    "name",
    "typePath[2]",
    "texture",
    "collectionMethodPath[0]",
    "location.startLongitude",
    "location.regionKind",
    "location.startVerticalPosition",
    "location.verticalReference",
    "location.localityName",
    "description.collectionDateStart",
    "description.collectionDateTimeZone",
    "existenceStatus",
    "availabilityStatus",
    "scientificContext.hostInstitution",
    "scientificContext.collectorOrcid",
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

  it("freezes the collection origin only on the collection-specimen branch", () => {
    expect(isFrozen("scientificContext.collectionOrigin")).toBe(false);
    expect(
      publishedSampleFrozenField(
        "collection_specimen",
        null,
      )("scientificContext.collectionOrigin"),
    ).toBe(true);
  });

  it("freezes no branch field without a provenance status", () => {
    const withoutBranch = publishedSampleFrozenField(null, null);
    expect(withoutBranch("scientificContext.collectorName")).toBe(false);
    expect(withoutBranch("scientificContext.collectionOrigin")).toBe(false);
    expect(withoutBranch("manualGroupIds")).toBe(true);
  });

  describe("material levels", () => {
    it.each(["rock.igneous.plutonic.felsic.granite", "rock.igneous.plutonic"])(
      "freezes materialPath[0] on %s, its frozen root",
      (material) => {
        expect(
          publishedSampleFrozenField(
            "field_sample",
            material,
          )("materialPath[0]"),
        ).toBe(true);
      },
    );

    it.each([
      "materialPath[1]",
      "materialPath[2]",
      "materialPath[3]",
      "materialPath[4]",
    ])("leaves %s editable, below the frozen root", (field) => {
      expect(
        publishedSampleFrozenField(
          "field_sample",
          "rock.igneous.plutonic.felsic.granite",
        )(field),
      ).toBe(false);
    });
  });
});
