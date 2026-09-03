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

describe("sample condition persistence", () => {
  pgTest("should round-trip a full condition", async ({ db }) => {
    const condition = {
      packaging: "glass_bottle" as const,
      storageConditions: [...STORAGE_CONDITIONS],
      temperature: {
        type: "frozen" as const,
        measurement: { value: -18, unit: "celsius" as const },
      },
      humidity: { type: "controlled" as const, percentage: 40 },
      light: "total_darkness" as const,
      pressure: {
        type: "controlled_gas" as const,
        measurement: { value: 1.2, unit: "bar" as const },
      },
      specificConditions: "Stored under argon after freeze-drying",
    };
    const created = await insertSample(db, { ...base, condition });
    expect(created.condition).toEqual(condition);
    expect(await readSample(db, created.id)).toEqual(created);
  });

  pgTest(
    "should round-trip a category without its numeric reading",
    async ({ db }) => {
      const condition = {
        storageConditions: [
          "temperature_controlled" as const,
          "moisture_controlled" as const,
          "pressure_controlled" as const,
        ],
        temperature: { type: "ambient" as const },
        humidity: { type: "dry" as const },
        pressure: { type: "vacuum" as const },
      };
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
