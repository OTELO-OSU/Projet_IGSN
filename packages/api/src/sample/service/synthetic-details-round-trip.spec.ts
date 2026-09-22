import type { SyntheticDetails } from "@projet-igsn/domain/sample/synthetic-details/model";

import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Synthetic details sample",
  nature: "inapplicable" as const,
  type: null,
  material: "rock_and_sediment.synthetic_rock_mineral",
  collectionMethod: null,
};

const roundTripped: [string, SyntheticDetails][] = [
  [
    "a full synthetic details section",
    {
      startingMaterial: "mixture",
      startingMaterialNature: "powder",
      startingMaterialComposition: "MgO + SiO2,\nground together",
      finalProduct: "mineral",
      experimentType: "crystallization_dynamic",
      experimentDuration: { value: 12, unit: "hour" },
      synthesisDate: {
        precision: "day",
        start: "2025-01-10",
        end: "2025-01-12",
      },
      operatorFirstname: "Marie",
      operatorLastname: "Curie",
      researchStructure: ["04kdfz702", "02feahw73"],
      temperature: { value: 1200, unit: "celsius" },
      pressure: { value: 1.5, unit: "gpa" },
      experimentalProtocol: "Piston-cylinder run,\nquenched in water",
      experimentPurpose: "Phase stability of forsterite",
      equipmentUsed: "Piston cylinder press",
    },
  ],
  [
    "an hour-precision synthesis date in its own time zone",
    {
      synthesisDate: {
        precision: "hour",
        start: "2025-01-10T08:45",
        end: "2025-01-10T19:05",
        timeZone: "Pacific/Auckland",
      },
    },
  ],
  ["a section holding a single field", { startingMaterial: "natural" }],
];

describe("sample synthetic details persistence", () => {
  pgTest.for(roundTripped)(
    "should round-trip %s",
    async ([, syntheticDetails], { db }) => {
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
        operatorFirstname: "Pierre",
        operatorLastname: "Curie",
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
