import type ExcelJS from "exceljs";

import { describe, expect, it } from "vitest";

import { MAX_IMPORT_ROWS, SHEETS } from "./columns.ts";
import {
  CLEAN_INPUT,
  CLEAN_ROWS_BY_PATH,
  cleanBook,
  deleteColumn,
  fill,
  swapColumns,
  templateBook,
} from "./import-fixture.ts";
import { readRows } from "./read-rows.ts";
import { templateLayout } from "./template-layout.ts";

const read = (book: ExcelJS.Workbook) =>
  readRows(book, templateLayout(book).layout);

const CLEAN = {
  samples: [{ row: 3, input: CLEAN_INPUT, rowsByPath: CLEAN_ROWS_BY_PATH }],
  issues: [],
};

const issue = (sheet: string, row: number, column: string, code: string) => ({
  sheet,
  row,
  column,
  code,
});

describe("readRows", () => {
  it("should turn each filled row into a sample candidate, child rows joined on their Sample #", async () => {
    expect(read(await cleanBook())).toEqual(CLEAN);
  });

  it("should read the same samples from reordered columns and a deleted optional one", async () => {
    const book = await cleanBook();
    swapColumns(book, SHEETS.samples, "Name", "Latitude");
    swapColumns(book, SHEETS.relations, "Identifier", "Resource type");
    deleteColumn(book, SHEETS.samples, "Local ID description");

    expect(read(book)).toEqual(CLEAN);
  });

  it("should accept a raw code where a label is expected", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, 3, {
      Nature: "hand_sample",
      "Material (level 2)": "rock",
    });

    expect(read(book)).toEqual(CLEAN);
  });

  it("should read a date cell down to the minute when the row's precision is the hour", async () => {
    const book = await cleanBook();
    fill(book, SHEETS.samples, 3, {
      "Collection date precision": "Hour and minute",
      "Collection date start": new Date(Date.UTC(2024, 0, 15, 8, 30)),
      "Collection date end": "2024-01-15T09:00",
      "Collection date time zone": "Europe/Paris",
    });

    expect(read(book).samples[0]?.input.description).toEqual({
      ...CLEAN_INPUT.description,
      collectionDate: {
        precision: "hour",
        start: "2024-01-15T08:30",
        end: "2024-01-15T09:00",
        timeZone: "Europe/Paris",
      },
    });
  });

  it("should answer no_sample when no row is filled", async () => {
    expect(read(await templateBook())).toEqual({
      samples: [],
      issues: [{ sheet: SHEETS.samples, code: "no_sample" }],
    });
  });

  it("should answer too_many_rows past the import row cap", async () => {
    const book = await templateBook();
    for (let row = 3; row < 3 + MAX_IMPORT_ROWS + 1; row++) {
      fill(book, SHEETS.samples, row, { Name: `Sample ${row}` });
    }

    expect(read(book)).toEqual({
      samples: [],
      issues: [{ sheet: SHEETS.samples, code: "too_many_rows" }],
    });
  });

  it.each<[string, (book: ExcelJS.Workbook) => void, object[]]>([
    [
      "an unknown vocabulary label",
      (book) => fill(book, SHEETS.samples, 3, { Nature: "Big rock" }),
      [issue(SHEETS.samples, 3, "Nature", "unknown_value")],
    ],
    [
      "a hierarchy level filled under an empty one",
      (book) => fill(book, SHEETS.samples, 3, { "Material (level 2)": null }),
      [issue(SHEETS.samples, 3, "Material (level 3)", "parent_level_missing")],
    ],
    [
      "a hierarchy level filled under a deleted one",
      (book) => {
        deleteColumn(book, SHEETS.samples, "Collection method (level 2)");
        fill(book, SHEETS.samples, 3, {
          "Collection method (level 1)": "Coring",
          "Collection method (level 3)": "Giant",
        });
      },
      [
        issue(
          SHEETS.samples,
          3,
          "Collection method (level 3)",
          "parent_level_missing",
        ),
      ],
    ],
    [
      "a child row pointing at no sample row",
      (book) => fill(book, SHEETS.relations, 3, { "Sample #": 7 }),
      [issue(SHEETS.relations, 3, "Sample #", "unknown_sample_key")],
    ],
    [
      "a filled sample row repeating a Sample #",
      (book) =>
        fill(book, SHEETS.samples, 4, { "Sample #": 1, Name: "Basalt 2" }),
      [issue(SHEETS.samples, 4, "Sample #", "duplicate_sample_key")],
    ],
    [
      "a filled sample row without a Sample #",
      (book) =>
        fill(book, SHEETS.samples, 4, { "Sample #": null, Name: "Basalt 2" }),
      [issue(SHEETS.samples, 4, "Sample #", "missing_sample_key")],
    ],
    [
      "a cell of another position branch",
      (book) => fill(book, SHEETS.samples, 3, { "West longitude": 2.1 }),
      [issue(SHEETS.samples, 3, "West longitude", "not_applicable")],
    ],
    [
      "a governed cell kept without its deleted driver",
      (book) => deleteColumn(book, SHEETS.samples, "Oriented sample"),
      [issue(SHEETS.samples, 3, "Orientation explanation", "not_applicable")],
    ],
    [
      "a text that is not a number in a numeric column",
      (book) => fill(book, SHEETS.samples, 3, { Latitude: "abc" }),
      [issue(SHEETS.samples, 3, "Latitude", "not_a_number")],
    ],
    [
      "a storage-condition reading repeated with another value",
      (book) =>
        fill(book, SHEETS.storageConditions, 5, {
          "Sample #": 1,
          "Storage condition": "Temperature controlled",
          Temperature: "Ambient",
        }),
      [issue(SHEETS.storageConditions, 5, "Temperature", "duplicate_value")],
    ],
  ])("should report %s", async (_, edit, expected) => {
    const book = await cleanBook();
    edit(book);

    expect(read(book).issues).toEqual(expected);
  });
});
