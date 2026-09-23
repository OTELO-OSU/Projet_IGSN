import { describe, expect, it } from "vitest";

import {
  duplicateCheckCriteria,
  toDuplicateCriteria,
} from "./suspected-duplicate.ts";

const MATERIAL = "rock_and_sediment.rock.igneous.plutonic.felsic.granite";

const typedFieldCollector = {
  collectorUserId: null,
  collectorFirstname: "Pierre",
  collectorLastname: "Curie",
};

const typedCollectionCollector = {
  collectorUserId: null,
  collectorFirstname: "Alexander",
  collectorLastname: "von Humboldt",
};

const linkedCollector = {
  collectorUserId: "3f1a2b3c-4d5e-4f60-8123-456789abcdef",
  collectorFirstname: null,
  collectorLastname: null,
};

const noCollector = {
  collectorUserId: null,
  collectorFirstname: null,
  collectorLastname: null,
};

describe("toDuplicateCriteria", () => {
  it.each([
    {
      case: "the typed name of a field collector",
      context: typedFieldCollector,
      collector: typedFieldCollector,
    },
    {
      case: "the account link of a linked collector",
      context: linkedCollector,
      collector: linkedCollector,
    },
    {
      case: "the absence of a collector",
      context: noCollector,
      collector: noCollector,
    },
    {
      case: "the absence of a scientific context",
      context: null,
      collector: noCollector,
    },
  ])(
    "should carry the name, the material and $case",
    ({ context, collector }) => {
      expect(
        toDuplicateCriteria({
          name: "Granite du Sidobre",
          material: MATERIAL,
          scientificContext: context,
        }),
      ).toEqual({
        name: "Granite du Sidobre",
        material: MATERIAL,
        ...collector,
      });
    },
  );

  it.each([
    {
      case: "the material is null",
      input: {
        name: "Granite du Sidobre",
        material: null,
        scientificContext: typedFieldCollector,
      },
    },
    {
      case: "the name is blank",
      input: {
        name: "   ",
        material: MATERIAL,
        scientificContext: typedFieldCollector,
      },
    },
  ])("should suspect nothing when $case", ({ input }) => {
    expect(toDuplicateCriteria(input)).toBeNull();
  });
});

describe("duplicateCheckCriteria", () => {
  const sample = {
    name: "Granite du Sidobre",
    material: MATERIAL,
    scientificContext: typedFieldCollector,
  };

  it("should check a write the caller has not confirmed", () => {
    expect(duplicateCheckCriteria(sample)).toEqual(toDuplicateCriteria(sample));
  });

  it("should skip a write the caller confirmed", () => {
    expect(duplicateCheckCriteria(sample, { confirmed: true })).toBeNull();
  });

  it("should skip an edit leaving the name, material and collector alone", () => {
    expect(
      duplicateCheckCriteria(sample, { previous: { ...sample } }),
    ).toBeNull();
  });

  it.each([
    { case: "the name", edit: { name: "Granite de Bretagne" } },
    { case: "the material", edit: { material: `${MATERIAL}_porphyry` } },
    {
      case: "the collector",
      edit: { scientificContext: typedCollectionCollector },
    },
  ])("should check an edit changing $case", ({ edit }) => {
    const edited = { ...sample, ...edit };
    expect(duplicateCheckCriteria(edited, { previous: sample })).toEqual(
      toDuplicateCriteria(edited),
    );
  });
});
