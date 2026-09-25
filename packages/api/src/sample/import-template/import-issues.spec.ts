import type ExcelJS from "exceljs";

import { describe, expect, it } from "vitest";

import { SHEETS } from "./columns.ts";
import { deleteColumn, fill, templateBook } from "./import-fixture.ts";
import { importIssues } from "./import-issues.ts";

const bytesOf = async (book: ExcelJS.Workbook) =>
  new Uint8Array(await book.xlsx.writeBuffer()).buffer;

describe("importIssues", () => {
  it("should answer unreadable_file for bytes that are no workbook", async () => {
    expect(
      await importIssues(new TextEncoder().encode("a,b\n1,2").buffer),
    ).toEqual([{ code: "unreadable_file" }]);
  });

  it("should stop at a structural issue before reading any row", async () => {
    const book = await templateBook();
    deleteColumn(book, SHEETS.samples, "Nature");

    expect(await importIssues(await bytesOf(book))).toEqual([
      { sheet: SHEETS.samples, column: "Nature", code: "missing_column" },
    ]);
  });

  it("should stop at a parse issue before validating the samples", async () => {
    const book = await templateBook();
    fill(book, SHEETS.samples, 3, { Name: "Basalt 1", Nature: "Big rock" });

    expect(await importIssues(await bytesOf(book))).toEqual([
      {
        sheet: SHEETS.samples,
        row: 3,
        column: "Nature",
        code: "unknown_value",
      },
    ]);
  });
});
