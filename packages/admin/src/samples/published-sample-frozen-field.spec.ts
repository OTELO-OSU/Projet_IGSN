import { describe, expect, it } from "vitest";

import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";

describe("publishedSampleFrozenField", () => {
  const isFrozen = publishedSampleFrozenField("field_sample", null);

  it("freezes the fields the domain lock map lists", () => {
    expect(isFrozen("manualGroupIds")).toBe(true);
  });

  it.each(["name", "typePath[2]", "scientificContext.collectorOrcid"])(
    "leaves %s editable on a published sample",
    (field) => {
      expect(isFrozen(field)).toBe(false);
    },
  );

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
    const isFrozenLevel = publishedSampleFrozenField(
      "field_sample",
      "rock.igneous.plutonic.felsic.granite",
    );

    it("freezes the root level alone, leaving the deeper ones editable", () => {
      expect(isFrozenLevel("materialPath[0]")).toBe(true);
      expect(isFrozenLevel("materialPath[1]")).toBe(false);
      expect(isFrozenLevel("materialPath[4]")).toBe(false);
    });
  });
});
