import type ExcelJS from "exceljs";

import { describe, expect, it } from "vitest";

import type { TemplateLayout } from "./template-layout.ts";

import { REQUIRED_MARKER, SHEETS } from "./columns.ts";
import {
  columnOf,
  deleteColumn,
  sheetOf,
  templateBook,
} from "./import-fixture.ts";
import { templateLayout } from "./template-layout.ts";

const columnsOf = (layout: TemplateLayout, sheet: string) =>
  Object.fromEntries(
    layout
      .find((candidate) => candidate.name === sheet)
      ?.columns.map((column) => [
        column.header.replace(REQUIRED_MARKER, ""),
        column.number,
      ]) ?? [],
  );

const setHeader = (
  book: ExcelJS.Workbook,
  sheet: string,
  number: number,
  header: string,
) => {
  sheetOf(book, sheet).getCell(2, number).value = header;
};

describe("templateLayout", () => {
  it("should find a moved column by its header at its new position", async () => {
    const book = await templateBook();
    const samples = sheetOf(book, SHEETS.samples);
    const [name, nature] = [
      columnOf(samples, "Name"),
      columnOf(samples, "Nature"),
    ];
    setHeader(book, SHEETS.samples, name, "Nature");
    setHeader(book, SHEETS.samples, nature, "Name");

    const { layout, issues } = templateLayout(book);

    expect({
      issues,
      columns: columnsOf(layout, SHEETS.samples),
    }).toMatchObject({ issues: [], columns: { Name: nature, Nature: name } });
  });

  it("should match a header whatever its case, spacing and required marker", async () => {
    const book = await templateBook();
    const nature = columnOf(sheetOf(book, SHEETS.samples), "Nature");
    setHeader(book, SHEETS.samples, nature, "  NATURE   ");

    const { layout, issues } = templateLayout(book);

    expect({
      issues,
      nature: columnsOf(layout, SHEETS.samples).Nature,
    }).toEqual({
      issues: [],
      nature,
    });
  });

  it("should ignore an inserted column whose header it does not know", async () => {
    const book = await templateBook();
    const pristine = templateLayout(book).layout;
    const samples = sheetOf(book, SHEETS.samples);
    setHeader(book, SHEETS.samples, samples.columnCount + 1, "My notes");

    expect(templateLayout(book)).toEqual({ layout: pristine, issues: [] });
  });

  it.each([
    [SHEETS.samples, "Local ID"],
    [SHEETS.samples, "Collection origin"],
    [SHEETS.relations, "Title"],
  ])(
    "should leave the optional or conditional column %s / %s out without an issue",
    async (sheet, header) => {
      const book = await templateBook();
      deleteColumn(book, sheet, header);

      const { layout, issues } = templateLayout(book);

      expect({ issues, present: header in columnsOf(layout, sheet) }).toEqual({
        issues: [],
        present: false,
      });
    },
  );

  it("should leave a deleted child sheet out without an issue", async () => {
    const book = await templateBook();
    book.removeWorksheet(sheetOf(book, SHEETS.relations).id);

    const { layout, issues } = templateLayout(book);

    expect({
      issues,
      sheets: layout.map((sheet) => sheet.name).includes(SHEETS.relations),
    }).toEqual({ issues: [], sheets: false });
  });

  it.each<[string, (book: ExcelJS.Workbook) => void, object[]]>([
    [
      "the Samples sheet is deleted",
      (book) => book.removeWorksheet(sheetOf(book, SHEETS.samples).id),
      [{ sheet: SHEETS.samples, code: "missing_sheet" }],
    ],
    [
      "Sample # is deleted from Samples and from a child sheet",
      (book) => {
        deleteColumn(book, SHEETS.samples, "Sample #");
        deleteColumn(book, SHEETS.relations, "Sample #");
      },
      [
        { sheet: SHEETS.samples, column: "Sample #", code: "missing_column" },
        { sheet: SHEETS.relations, column: "Sample #", code: "missing_column" },
      ],
    ],
    [
      "always-required columns are deleted",
      (book) => {
        deleteColumn(book, SHEETS.samples, "Nature");
        deleteColumn(book, SHEETS.samples, "Material (level 3)");
      },
      [
        { sheet: SHEETS.samples, column: "Nature", code: "missing_column" },
        {
          sheet: SHEETS.samples,
          column: "Material (level 3)",
          code: "missing_column",
        },
      ],
    ],
    [
      "a header appears twice in a sheet",
      (book) => {
        const samples = sheetOf(book, SHEETS.samples);
        setHeader(book, SHEETS.samples, samples.columnCount + 1, "Nature");
      },
      [{ sheet: SHEETS.samples, column: "Nature", code: "duplicate_column" }],
    ],
  ])("should refuse the whole file when %s", async (_, edit, expected) => {
    const book = await templateBook();
    edit(book);

    expect(templateLayout(book).issues).toEqual(expected);
  });
});
