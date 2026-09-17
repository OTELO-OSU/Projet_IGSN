import type { Condition } from "@projet-igsn/domain/sample/condition/model";

import { STORAGE_CONDITIONS } from "@projet-igsn/domain/sample/condition/storage-condition";
import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Condition sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

const roundTripped: [string, Condition][] = [
  [
    "a full condition",
    {
      packaging: "glass_bottle",
      storageConditions: [...STORAGE_CONDITIONS],
      temperature: {
        type: "frozen",
        measurement: { value: -18, unit: "celsius" },
      },
      humidity: { type: "controlled", percentage: 40 },
      light: "total_darkness",
      pressure: {
        type: "controlled_gas",
        measurement: { value: 1.2, unit: "bar" },
      },
      specificConditions: "Stored under argon after freeze-drying",
    },
  ],
  [
    "a category without its numeric reading",
    {
      storageConditions: [
        "temperature_controlled",
        "moisture_controlled",
        "pressure_controlled",
      ],
      temperature: { type: "ambient" },
      humidity: { type: "dry" },
      pressure: { type: "vacuum" },
    },
  ],
];

describe("sample condition persistence", () => {
  pgTest.for(roundTripped)(
    "should round-trip %s",
    async ([, condition], { db }) => {
      const created = await insertSample(db, { ...base, condition });
      expect(created.condition).toEqual(condition);
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should return a null condition when the sample has none",
    async ({ db }) => {
      const created = await insertSample(db, base);
      expect(created.condition).toBeNull();
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest("should update a condition", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      condition: { storageConditions: ["light_controlled" as const] },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      condition: {
        storageConditions: ["moisture_controlled" as const],
        humidity: { type: "dehydrated" as const, percentage: 5 },
      },
    });
    expect(updated?.condition).toEqual({
      storageConditions: ["moisture_controlled"],
      humidity: { type: "dehydrated", percentage: 5 },
    });
  });

  pgTest("should clear a condition on update to null", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      condition: { packaging: "paper_bag" as const },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      condition: null,
    });
    expect(updated?.condition).toBeNull();
    expect(await readSample(db, created.id)).toEqual(updated);
  });
});
