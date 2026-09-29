import { sql } from "kysely";
import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { pgTest } from "../../tests/pg-test.ts";
import { publishableSample } from "../../tests/sample-fixtures.ts";
import { type Transactional } from "../../transaction.ts";
import { createSampleRepository } from "../repository.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";

async function lockAndDraw(db: Transactional<DB>): Promise<number> {
  await sql`lock table sample in share row exclusive mode`.execute(db);
  const { rows } = await sql<{
    n: string;
  }>`select nextval('sample_internal_number_seq') as n`.execute(db);
  return Number(rows[0]!.n);
}

async function publishedNumber(db: Transactional<DB>): Promise<number | null> {
  const created = await insertSample(db, publishableSample);
  return (await publishSample(db, created.id))!.internalNumber;
}

describe("reserveInternalNumbers", () => {
  pgTest(
    "should reserve the next numbers of the sequence and publish past them",
    async ({ db }) => {
      // Arrange
      const last = await lockAndDraw(db);
      // Act
      const reserved =
        await createSampleRepository(db).reserveInternalNumbers(160);
      // Assert
      expect(reserved).toEqual(
        Array.from({ length: 160 }, (_, index) => last + 1 + index),
      );
      expect(await publishedNumber(db)).toBe(last + 161);
    },
  );
});

describe("unavailableInternalNumbers", () => {
  pgTest(
    "should flag a used, an unissued and a beyond-int number and pass a reserved unused one",
    async ({ db }) => {
      // Arrange
      const repository = createSampleRepository(db);
      await lockAndDraw(db);
      const [reserved] = await repository.reserveInternalNumbers(1);
      const used = (await publishedNumber(db))!;
      // Act
      const unavailable = await repository.unavailableInternalNumbers([
        reserved!,
        used,
        used + 1,
        9_999_999_999,
      ]);
      // Assert
      expect(unavailable).toEqual(new Set([used, used + 1, 9_999_999_999]));
    },
  );
});
