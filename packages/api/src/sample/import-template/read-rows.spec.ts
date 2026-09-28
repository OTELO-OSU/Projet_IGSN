import type ExcelJS from "exceljs";

import { describe, expect, it } from "vitest";

import { SHEETS } from "./columns.ts";
import {
  CLEAN_SAMPLE,
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
  samples: [
    {
      row: 3,
      cells: {
        ...CLEAN_SAMPLE,
        "Sample #": "1",
        "Local ID": "123",
        Longitude: "2.35",
      },
      children: [
        {
          sheet: SHEETS.relations,
          row: 3,
          cells: {
            "Sample #": "1",
            "Identifier type": "DOI",
            Identifier: "https://doi.org/10.1234/abc",
            "Relation type": "Is cited by",
            "Resource type": "Book",
          },
        },
        {
          sheet: SHEETS.storageConditions,
          row: 3,
          cells: {
            "Sample #": "1",
            "Storage condition": "Temperature controlled",
            Temperature: "Frozen",
          },
        },
        {
          sheet: SHEETS.storageConditions,
          row: 4,
          cells: {
            "Sample #": "1",
            "Storage condition": "Light controlled",
            Light: "Total darkness",
          },
        },
      ],
    },
  ],
  orphans: [],
};

describe("readRows", () => {
  it("should read each filled row as its raw cells, child rows attached on their Sample #", async () => {
    expect(read(await cleanBook())).toEqual(CLEAN);
  });

  it("should read the same cells from reordered columns and a deleted optional one", async () => {
    const book = await cleanBook();
    swapColumns(book, SHEETS.samples, "Name", "Latitude");
    swapColumns(book, SHEETS.relations, "Identifier", "Resource type");
    deleteColumn(book, SHEETS.samples, "Local ID description");

    expect(read(book)).toEqual(CLEAN);
  });

  it("should carry bad values, bad keys and dangling child rows as they are", async () => {
    const book = await templateBook();
    fill(book, SHEETS.samples, 3, {
      Nature: "Big rock",
      Latitude: "abc",
      "Collection date start": "demain",
    });
    fill(book, SHEETS.samples, 4, { "Sample #": 1, Name: "Twin" });
    fill(book, SHEETS.samples, 5, { "Sample #": null, Name: "Keyless" });
    fill(book, SHEETS.relations, 3, { "Sample #": 7, Identifier: "x" });

    expect(read(book)).toEqual({
      samples: [
        {
          row: 3,
          cells: {
            "Sample #": "1",
            Nature: "Big rock",
            Latitude: "abc",
            "Collection date start": "demain",
          },
          children: [],
        },
        { row: 4, cells: { "Sample #": "1", Name: "Twin" }, children: [] },
        { row: 5, cells: { Name: "Keyless" }, children: [] },
      ],
      orphans: [
        {
          sheet: SHEETS.relations,
          row: 3,
          cells: { "Sample #": "7", Identifier: "x" },
        },
      ],
    });
  });
});
