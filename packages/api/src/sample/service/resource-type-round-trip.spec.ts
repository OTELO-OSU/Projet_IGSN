import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Resource type sample",
  nature: "hand_sample" as const,
  type: null,
  material: "rock.igneous.plutonic.felsic.granite",
  collectionMethod: null,
};

describe("sample resource type persistence", () => {
  pgTest("should round-trip a full resource type block", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      resourceType: "mineral_and_ore.uranium.sandstone",
      economicInterestElements: ["u", "fe"],
      economicResourceTypePrecision: "high-grade ore",
      economicDepositName: "Cigar Lake",
      economicDepositDescription: "Unconformity-related uranium deposit",
    });
    expect(created).toMatchObject({
      resourceType: "mineral_and_ore.uranium.sandstone",
      economicInterestElements: ["u", "fe"],
      economicResourceTypePrecision: "high-grade ore",
      economicDepositName: "Cigar Lake",
      economicDepositDescription: "Unconformity-related uranium deposit",
    });
    expect(await readSample(db, created.id)).toEqual(created);
  });

  pgTest(
    "should keep the details of an eligible material with no resource type",
    async ({ db }) => {
      const created = await insertSample(db, {
        ...base,
        economicDepositName: "Cigar Lake",
      });
      expect(created).toMatchObject({
        resourceType: null,
        economicInterestElements: [],
        economicDepositName: "Cigar Lake",
      });
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest("should clear the resource type on update", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      resourceType: "mineral_and_ore.uranium",
      economicInterestElements: ["fe"],
      economicDepositName: "Ruhr",
    });
    expect(created).toMatchObject({
      economicInterestElements: ["fe"],
      economicDepositName: "Ruhr",
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      material: "mineral",
    });
    expect(updated).toMatchObject({
      resourceType: null,
      economicInterestElements: [],
      economicDepositName: null,
    });
    expect(await readSample(db, created.id)).toEqual(updated);
  });
});
