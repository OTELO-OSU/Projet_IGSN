import type { SampleProcessStep } from "@projet-igsn/domain/sample/process-step/model";
import type { Kysely } from "kysely";

import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Thin section of the block",
  nature: "thin_section" as const,
  type: null,
};

const KIND_ONLY: SampleProcessStep = {
  kind: "preparation",
  date: null,
  description: null,
};

const DAY_STEP: SampleProcessStep = {
  kind: "subsampling",
  date: { precision: "day", start: "2024-06-05", end: "2024-06-06" },
  description: "Sawn into three slabs",
};

const HOUR_STEP: SampleProcessStep = {
  kind: "transformation",
  date: {
    precision: "hour",
    start: "2025-01-15T09:00",
    end: "2025-01-15T11:00",
    timeZone: "Europe/Paris",
  },
  description: "Mounted in epoxy and polished",
};

const subSampleOf = async (
  db: Kysely<DB>,
  processSteps: SampleProcessStep[],
) => {
  const parent = await insertSample(db, base);
  await publishSample(db, parent.id);
  return insertSample(db, { ...base, parentIds: [parent.id], processSteps });
};

describe("sample process steps persistence", () => {
  pgTest.for([
    { rule: "a kind alone", steps: [KIND_ONLY] },
    { rule: "a day-precision date", steps: [DAY_STEP] },
    { rule: "an hour-precision date and its time zone", steps: [HOUR_STEP] },
  ])("should round-trip $rule", async ({ steps }, { db }) => {
    // Act
    const created = await subSampleOf(db, steps);
    // Assert
    expect(created.processSteps).toEqual(steps);
    expect(await readSample(db, created.id)).toEqual(created);
  });

  pgTest(
    "should read the steps back in process order whatever the entry order",
    async ({ db }) => {
      // Act
      const created = await subSampleOf(db, [HOUR_STEP, KIND_ONLY, DAY_STEP]);
      // Assert
      expect(created.processSteps).toEqual([DAY_STEP, KIND_ONLY, HOUR_STEP]);
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should clear the stored steps when the update carries none",
    async ({ db }) => {
      // Arrange
      const created = await subSampleOf(db, [DAY_STEP, HOUR_STEP]);
      // Act
      const updated = await updateSample(db, created.id, base);
      // Assert
      expect(updated?.processSteps).toEqual([]);
      expect((await readSample(db, created.id))?.processSteps).toEqual([]);
    },
  );

  pgTest.for([
    {
      path: "created",
      write: async (db: Kysely<DB>) => {
        await insertSample(db, { ...base, processSteps: [KIND_ONLY] });
      },
    },
    {
      path: "updated",
      write: async (db: Kysely<DB>) => {
        const root = await insertSample(db, base);
        await updateSample(db, root.id, { ...base, processSteps: [KIND_ONLY] });
      },
    },
  ])(
    "should refuse process steps on a sample with no parent when it is $path",
    async ({ write }, { db }) => {
      await expect(write(db)).rejects.toThrow(
        "Process steps require a parent sample",
      );
    },
  );
});
