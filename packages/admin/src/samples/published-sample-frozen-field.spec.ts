import { describe, expect, it } from "vitest";

import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";

describe("publishedSampleFrozenField", () => {
  const isFrozen = publishedSampleFrozenField("field_sample", null);

  it.each([
    "manualGroupIds",
    "syntheticDetails.operatorUserId",
    "syntheticDetails.operatorFirstname",
    "syntheticDetails.operatorLastname",
    "syntheticDetails.operatorOrcid",
  ])("freezes %s, which the domain lock map lists", (field) => {
    expect(isFrozen(field)).toBe(true);
  });

  it.each([
    "name",
    "typePath[2]",
    "scientificContext.chiefScientistFirstname",
    "scientificContext.chiefScientistLastname",
  ])("leaves %s editable on a published sample", (field) => {
    expect(isFrozen(field)).toBe(false);
  });

  it.each([
    "scientificContext.collectorUserId",
    "scientificContext.collectorFirstname",
    "scientificContext.collectorLastname",
    "scientificContext.collectorOrcid",
  ])("freezes %s only on the field-sample branch", (field) => {
    expect(isFrozen(field)).toBe(true);
    expect(publishedSampleFrozenField("collection_specimen", null)(field)).toBe(
      false,
    );
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
    expect(withoutBranch("scientificContext.collectorLastname")).toBe(false);
    expect(withoutBranch("scientificContext.collectionOrigin")).toBe(false);
    expect(withoutBranch("manualGroupIds")).toBe(true);
  });

  describe("material levels", () => {
    const isFrozenLevel = publishedSampleFrozenField(
      "field_sample",
      "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
    );

    it("freezes the root and its family, leaving the deeper ones editable", () => {
      expect(isFrozenLevel("materialPath[0]")).toBe(true);
      expect(isFrozenLevel("materialPath[1]")).toBe(true);
      expect(isFrozenLevel("materialPath[2]")).toBe(false);
      expect(isFrozenLevel("materialPath[4]")).toBe(false);
    });
  });
});
