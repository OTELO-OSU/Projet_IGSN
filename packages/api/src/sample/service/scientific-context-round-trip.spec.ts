import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { getSample } from "./get-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Scientific context sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

describe("sample scientific context persistence", () => {
  pgTest(
    "should round-trip a full recent-collection context",
    async ({ db }) => {
      const scientificContext = {
        provenanceStatus: "recent_collection" as const,
        funderOrganization: "02feahw73",
        researchProgramName: "Deep Biosphere Survey",
        researchProgramChief: "Marie Curie",
        researchProgramChiefOrcid: "0000-0002-1825-0097",
        researchStructure: ["04kdfz702", "02feahw73"],
        collectorName: "Pierre Curie",
        collectorOrcid: "0000-0001-2345-6789",
        researchCampaign: "MD 209 / 2021",
        funding: "ANR grant 42",
        researchProgramDescription: "Multi-year survey of\nsub-seafloor life",
        fieldName: "Site A",
        missionDescription: "Coring campaign in\nthe North Atlantic",
      };
      const created = await insertSample(db, { ...base, scientificContext });
      expect(created.scientificContext).toEqual(scientificContext);
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should round-trip a full historical-specimen context",
    async ({ db }) => {
      const scientificContext = {
        provenanceStatus: "historical_specimen" as const,
        collectionCurator: "Georges Cuvier",
        collectionOrigin: "scientific_expedition" as const,
        collectorName: "Alexander von Humboldt",
        collectionContextDescription: "Assembled during the\n1799 expedition",
      };
      const created = await insertSample(db, { ...base, scientificContext });
      expect(created.scientificContext).toEqual(scientificContext);
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should round-trip a context holding only its provenance status",
    async ({ db }) => {
      const scientificContext = {
        provenanceStatus: "recent_collection" as const,
      };
      const created = await insertSample(db, { ...base, scientificContext });
      expect(created.scientificContext).toEqual(scientificContext);
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should return a null context when the sample has none",
    async ({ db }) => {
      const created = await insertSample(db, base);
      expect(created.scientificContext).toBeNull();
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest("should switch branches on update", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      scientificContext: {
        provenanceStatus: "recent_collection" as const,
        researchProgramName: "Old programme",
        collectorName: "Someone",
      },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      scientificContext: {
        provenanceStatus: "historical_specimen" as const,
        collectionCurator: "Georges Cuvier",
      },
    });
    // The previous branch's columns are cleared, so no recent-collection field
    // leaks into the historical shape.
    expect(updated?.scientificContext).toEqual({
      provenanceStatus: "historical_specimen",
      collectionCurator: "Georges Cuvier",
    });
    expect(await getSample(db, created.id)).toEqual(updated);
  });

  pgTest("should clear a context on update to null", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      scientificContext: {
        provenanceStatus: "historical_specimen" as const,
        collectionCurator: "Georges Cuvier",
      },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      scientificContext: null,
    });
    expect(updated?.scientificContext).toBeNull();
    expect(await getSample(db, created.id)).toEqual(updated);
  });
});
