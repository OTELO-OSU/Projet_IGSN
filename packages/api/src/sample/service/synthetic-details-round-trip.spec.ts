import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Synthetic details sample",
  nature: "inapplicable" as const,
  type: null,
  material: "synthetic_rock_mineral",
  collectionMethod: null,
};

describe("sample synthetic details persistence", () => {
  pgTest(
    "should round-trip a full synthetic details section",
    async ({ db }) => {
      const syntheticDetails = {
        startingMaterial: "mixture" as const,
        startingMaterialNature: "powder" as const,
        startingMaterialComposition: "MgO + SiO2,\nground together",
        finalProduct: "mineral" as const,
        experimentType: "crystallization_dynamic" as const,
        experimentDuration: { value: 12, unit: "hour" as const },
        experimentDurationNotRelevant: false,
        synthesisDate: { start: "2025-01-10", end: "2025-01-12" },
        operatorName: "Marie Curie",
        operatorOrcid: "0000-0002-1825-0097",
        researchStructure: ["04kdfz702", "02feahw73"],
        temperature: { value: 1200, unit: "celsius" as const },
        pressure: { value: 1.5, unit: "gpa" as const },
        experimentalProtocol: "Piston-cylinder run,\nquenched in water",
        experimentPurpose: "Phase stability of forsterite",
        equipmentUsed: "Piston cylinder press",
      };
      const created = await insertSample(db, { ...base, syntheticDetails });
      expect(created.syntheticDetails).toEqual(syntheticDetails);
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should round-trip a section holding a single field",
    async ({ db }) => {
      const syntheticDetails = { startingMaterial: "natural" as const };
      const created = await insertSample(db, { ...base, syntheticDetails });
      expect(created.syntheticDetails).toEqual(syntheticDetails);
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should return null details when the sample has none",
    async ({ db }) => {
      const created = await insertSample(db, base);
      expect(created.syntheticDetails).toBeNull();
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest("should clear the details on update to null", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      syntheticDetails: {
        startingMaterialNature: "glass",
        operatorName: "Pierre Curie",
      },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      syntheticDetails: null,
    });
    expect(updated?.syntheticDetails).toBeNull();
    expect(await readSample(db, created.id)).toEqual(updated);
  });
});
