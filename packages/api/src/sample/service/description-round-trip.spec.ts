import type { Description } from "@projet-igsn/domain/sample/description/model";

import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Description sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

const roundTripped: [string, Description][] = [
  [
    "a full description",
    {
      collectionDate: {
        precision: "day",
        start: "2014-10-01",
        end: "2014-10-24",
      },
      oriented: true,
      orientationExplanation: "Oriented with a compass on the north face",
      openDescription: "Coarse-grained, weathered surface",
      length: { value: 30, unit: "cm" },
      width: { value: 12.5, unit: "cm" },
      thickness: { value: 8, unit: "mm" },
      mass: { value: 1.2, unit: "kg" },
      volume: { value: 350, unit: "cm3" },
    },
  ],
  [
    "a single-date collection as start === end",
    {
      collectionDate: {
        precision: "day",
        start: "2014-10-24",
        end: "2014-10-24",
      },
    },
  ],
  [
    "an hour-precision collection date in its own time zone",
    {
      collectionDate: {
        precision: "hour",
        start: "2025-06-15T14:30",
        end: "2025-06-16T09:00",
        timeZone: "Europe/Paris",
      },
    },
  ],
];

describe("sample description persistence", () => {
  pgTest.for(roundTripped)(
    "should round-trip %s",
    async ([, description], { db }) => {
      const created = await insertSample(db, { ...base, description });
      expect(created.description).toEqual(description);
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should return a null description when the sample has none",
    async ({ db }) => {
      const created = await insertSample(db, base);
      expect(created.description).toBeNull();
      expect(await readSample(db, created.id)).toEqual(created);
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
        collectionDate: {
          precision: "day" as const,
          start: "2026-01-01",
          end: "2026-02-01",
        },
        mass: { value: 0.5, unit: "kg" as const },
      },
    });
    expect(updated?.description).toEqual({
      collectionDate: {
        precision: "day",
        start: "2026-01-01",
        end: "2026-02-01",
      },
      mass: { value: 0.5, unit: "kg" },
    });
  });

  pgTest("should clear a description on update to null", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      description: {
        collectionDate: {
          precision: "day" as const,
          start: "2026-01-01",
          end: "2026-01-01",
        },
        oriented: false,
      },
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      description: null,
    });
    expect(updated?.description).toBeNull();
    expect(await readSample(db, created.id)).toEqual(updated);
  });
});
