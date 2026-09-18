import type { DateRange } from "@projet-igsn/domain/sample/date-range";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { draft } from "../../tests/sample-fixtures.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { updateSample } from "./update-sample.ts";

const payloadDate = {
  precision: "day",
  start: "2026-03-03",
  end: "2026-03-03",
} satisfies DateRange;

const day = (start: string, end: string) =>
  ({ precision: "day", start, end }) satisfies DateRange;

const withDate = (date: DateRange | null): CreateSample => ({
  ...draft,
  description: date === null ? {} : { collectionDate: date },
});

describe("collection date inheritance", () => {
  pgTest(
    "should derive a sub-sample's collection date from its parents, ignoring its payload",
    async ({ db }) => {
      // Arrange
      const parent = await insertSample(
        db,
        withDate(day("2026-01-01", "2026-01-02")),
      );
      await publishSample(db, parent.id);

      // Act
      const child = await insertSample(db, {
        ...withDate(payloadDate),
        parentIds: [parent.id],
      });

      // Assert
      expect(child.description?.collectionDate).toEqual(
        day("2026-01-01", "2026-01-02"),
      );
    },
  );

  pgTest(
    "should re-derive a sub-sample's collection date on update, ignoring its payload",
    async ({ db }) => {
      // Arrange
      const parent = await insertSample(
        db,
        withDate(day("2026-01-01", "2026-01-02")),
      );
      await publishSample(db, parent.id);
      const child = await insertSample(db, {
        ...withDate(payloadDate),
        parentIds: [parent.id],
      });

      // Act
      const updated = await updateSample(db, child.id, withDate(payloadDate));

      // Assert
      expect(updated?.description?.collectionDate).toEqual(
        day("2026-01-01", "2026-01-02"),
      );
    },
  );
});
