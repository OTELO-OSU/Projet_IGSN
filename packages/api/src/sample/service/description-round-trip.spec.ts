import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { getSample } from "./get-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Description sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

describe("sample description persistence", () => {
  pgTest("should round-trip a full description", async ({ db }) => {
    const description = {
      collectionDate: { start: "2014-10-01", end: "2014-10-24" },
      oriented: true,
      orientationExplanation: "Oriented with a compass on the north face",
      openDescription: "Coarse-grained, weathered surface",
      length: { value: 30, unit: "cm" as const },
      width: { value: 12.5, unit: "cm" as const },
      thickness: { value: 8, unit: "mm" as const },
      mass: { value: 1.2, unit: "kg" as const },
      volume: { value: 350, unit: "cm3" as const },
    };
    const created = await insertSample(db, { ...base, description });
    expect(created.description).toEqual(description);
    expect(await getSample(db, created.id)).toEqual(created);
  });

  pgTest(
    "should round-trip a single-date collection as start === end",
    async ({ db }) => {
      const description = {
        collectionDate: { start: "2014-10-24", end: "2014-10-24" },
      };
      const created = await insertSample(db, { ...base, description });
      expect(created.description).toEqual(description);
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should return a null description when the sample has none",
    async ({ db }) => {
      const created = await insertSample(db, base);
      expect(created.description).toBeNull();
      expect(await getSample(db, created.id)).toEqual(created);
    },
  );

  pgTest("should update a description", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      description: { mass: { value: 500, unit: "g" as const } },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      description: {
        collectionDate: { start: "2026-01-01", end: "2026-02-01" },
        mass: { value: 0.5, unit: "kg" as const },
      },
    });
    expect(updated?.description).toEqual({
      collectionDate: { start: "2026-01-01", end: "2026-02-01" },
      mass: { value: 0.5, unit: "kg" },
    });
  });

  pgTest("should clear a description on update to null", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      description: {
        collectionDate: { start: "2026-01-01", end: "2026-01-01" },
        oriented: false,
      },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      description: null,
    });
    expect(updated?.description).toBeNull();
    expect(await getSample(db, created.id)).toEqual(updated);
  });
});
