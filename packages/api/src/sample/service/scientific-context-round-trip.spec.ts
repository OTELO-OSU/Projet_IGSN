import type { ScientificContext } from "@projet-igsn/domain/sample/scientific-context/model";

import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Scientific context sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

const roundTripped: [string, ScientificContext][] = [
  [
    "a full field-sample context",
    {
      provenanceStatus: "field_sample",
      additionalRoles: [],
      funderOrganizations: ["02feahw73", "04kdfz702"],
      researchProgramName: "Deep Biosphere Survey",
      chiefScientistFirstname: "Marie",
      chiefScientistLastname: "Curie",
      hostInstitution: ["04kdfz702", "02feahw73"],
      collectorFirstname: "Pierre",
      collectorLastname: "Curie",
      funding: "ANR grant 42",
      researchProgramDescription: "Multi-year survey of\nsub-seafloor life",
      platformType: "ship",
      launchPlatformName: "Marion Dufresne",
    },
  ],
  [
    "a full collection-specimen context",
    {
      provenanceStatus: "collection_specimen",
      collectionOrigin: "scientific_expedition",
      collectorFirstname: "Alexander",
      collectorLastname: "von Humboldt",
      collectionContextDescription: "Assembled during the\n1799 expedition",
    },
  ],
  [
    "a context holding only its provenance status",
    { provenanceStatus: "field_sample", additionalRoles: [] },
  ],
];

describe("sample scientific context persistence", () => {
  pgTest.for(roundTripped)(
    "should round-trip %s",
    async ([, scientificContext], { db }) => {
      const created = await insertSample(db, { ...base, scientificContext });
      expect(created.scientificContext).toEqual(scientificContext);
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should return a null context when the sample has none",
    async ({ db }) => {
      const created = await insertSample(db, base);
      expect(created.scientificContext).toBeNull();
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest("should switch branches on update", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      scientificContext: {
        provenanceStatus: "field_sample" as const,
        additionalRoles: [],
        researchProgramName: "Old programme",
        collectorFirstname: "Some",
        collectorLastname: "One",
      },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      scientificContext: {
        provenanceStatus: "collection_specimen" as const,
        collectionOrigin: "scientific_expedition" as const,
      },
    });
    expect(updated?.scientificContext).toEqual({
      provenanceStatus: "collection_specimen",
      collectionOrigin: "scientific_expedition",
    });
    expect(await readSample(db, created.id)).toEqual(updated);
  });

  pgTest("should clear a context on update to null", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      scientificContext: {
        provenanceStatus: "collection_specimen" as const,
        collectionOrigin: "scientific_expedition" as const,
      },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      scientificContext: null,
    });
    expect(updated?.scientificContext).toBeNull();
    expect(await readSample(db, created.id)).toEqual(updated);
  });
});
