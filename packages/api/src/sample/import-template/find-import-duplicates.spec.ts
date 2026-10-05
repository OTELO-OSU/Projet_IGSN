import type ExcelJS from "exceljs";

import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { findDuplicateSamplesOfEach } from "../service/find-duplicate-samples.ts";
import { insertSample } from "../service/insert-sample.ts";
import { publishSample } from "../service/publish-sample.ts";
import { SHEETS } from "./columns.ts";
import { findImportDuplicates } from "./find-import-duplicates.ts";
import {
  CLEAN_DUPLICATE,
  CLEAN_SAMPLE,
  cleanBook,
  fill,
} from "./import-fixture.ts";

const bytesOf = async (book: ExcelJS.Workbook) =>
  new Uint8Array(await book.xlsx.writeBuffer()).buffer;

describe("findImportDuplicates", () => {
  pgTest(
    "should report each workbook row matching a published sample under its row number",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, CLEAN_DUPLICATE);
      const published = (await publishSample(db, created.id))!;
      const book = await cleanBook();
      fill(book, SHEETS.samples, 4, { ...CLEAN_SAMPLE, Name: "Basalt 2" });
      // Act
      const duplicates = await findImportDuplicates(
        await bytesOf(book),
        (criteria) => findDuplicateSamplesOfEach(db, criteria),
      );
      // Assert
      expect(duplicates).toEqual([
        {
          row: 3,
          duplicates: [
            { id: published.id, igsn: published.igsn, name: published.name },
          ],
        },
      ]);
    },
    30_000,
  );

  pgTest(
    "should report nothing for a workbook the import rejects unread",
    async ({ db }) => {
      // Act
      const duplicates = await findImportDuplicates(
        new TextEncoder().encode("not a workbook").buffer,
        (criteria) => findDuplicateSamplesOfEach(db, criteria),
      );
      // Assert
      expect(duplicates).toEqual([]);
    },
  );
});
