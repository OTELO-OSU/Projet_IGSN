import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { getSample } from "./get-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Economic interest sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

describe("sample economic interest persistence", () => {
  pgTest("should round-trip a full economic interest block", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      economicInterest: "yes.mineral_and_ore.uranium.sandstone",
      economicInterestElements: ["u", "fe"],
      economicResourceTypePrecision: "high-grade ore",
      economicDepositName: "Cigar Lake",
      economicDepositDescription: "Unconformity-related uranium deposit",
    });
    expect(created).toMatchObject({
      economicInterest: "yes.mineral_and_ore.uranium.sandstone",
      economicInterestElements: ["u", "fe"],
      economicResourceTypePrecision: "high-grade ore",
      economicDepositName: "Cigar Lake",
      economicDepositDescription: "Unconformity-related uranium deposit",
    });
    expect(await getSample(db, created.id)).toEqual(created);
  });

  pgTest(
    "should default to a null answer and empty elements when the sample has none",
    async ({ db }) => {
      const created = await insertSample(db, base);
      expect(created).toMatchObject({
        economicInterest: null,
        economicInterestElements: [],
        economicResourceTypePrecision: null,
        economicDepositName: null,
        economicDepositDescription: null,
      });
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should null every detail when the answer is not yes, even if details are sent",
    async ({ db }) => {
      const created = await insertSample(db, {
        ...base,
        economicInterest: "no",
        economicInterestElements: ["fe"],
        economicDepositName: "Ruhr",
      });
      expect(created).toMatchObject({
        economicInterest: "no",
        economicInterestElements: [],
        economicDepositName: null,
      });
    },
  );

  pgTest(
    "should keep the detail but null elements for a yes answer outside mineral_and_ore",
    async ({ db }) => {
      const created = await insertSample(db, {
        ...base,
        economicInterest: "yes.hydrocarbon.coal",
        economicInterestElements: ["fe"],
        economicDepositName: "Ruhr",
      });
      expect(created).toMatchObject({
        economicInterest: "yes.hydrocarbon.coal",
        economicInterestElements: [],
        economicDepositName: "Ruhr",
      });
    },
  );

  pgTest("should clear economic interest on update", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      economicInterest: "yes.mineral_and_ore.uranium",
      economicInterestElements: ["fe"],
      economicDepositName: "Ruhr",
    });
    expect(created).toMatchObject({
      economicInterestElements: ["fe"],
      economicDepositName: "Ruhr",
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      economicInterest: "no",
    });
    expect(updated).toMatchObject({
      economicInterest: "no",
      economicInterestElements: [],
      economicDepositName: null,
    });
    expect(await getSample(db, created.id)).toEqual(updated);
  });
});
