import type ExcelJS from "exceljs";

import { describe, expect, it } from "vitest";

import { SHEETS } from "./columns.ts";
import {
  CLEAN_SAMPLE,
  cleanBook,
  deleteColumn,
  fill,
  FIRST_SAMPLE_ROW,
  swapColumns,
  templateBook,
  filledRowsOf,
} from "./import-fixture.ts";

const read = (book: ExcelJS.Workbook) => filledRowsOf(book);

const HAZARDS = {
  Radioactivity: "No",
  "Asbestos-rich": "No",
  "Chemical risk": "No",
};

const DEFAULTED = {
  Nature: "Hand sample",
  "Oriented sample": "No",
  ...HAZARDS,
  "Existence status": "Exists",
  "Availability status": "Available",
};

const CLEAN = {
  samples: [
    {
      row: FIRST_SAMPLE_ROW,
      cells: {
        ...CLEAN_SAMPLE,
        ...HAZARDS,
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
    swapColumns(book, SHEETS.samples, "Sample name", "Latitude");
    swapColumns(book, SHEETS.relations, "Identifier", "Resource type");
    deleteColumn(book, SHEETS.samples, "Local ID description");

    expect(read(book)).toEqual(CLEAN);
  });

  it("should carry bad values, bad keys and dangling child rows as they are", async () => {
    const book = await templateBook();
    fill(book, SHEETS.samples, FIRST_SAMPLE_ROW, {
      Nature: "Big rock",
      Latitude: "abc",
      "Collection date start": "demain",
    });
    fill(book, SHEETS.samples, FIRST_SAMPLE_ROW + 1, {
      "Sample #": 1,
      "Sample name": "Twin",
    });
    fill(book, SHEETS.samples, FIRST_SAMPLE_ROW + 2, {
      "Sample #": null,
      "Sample name": "Keyless",
    });
    fill(book, SHEETS.relations, 3, { "Sample #": 7, Identifier: "x" });

    expect(read(book)).toEqual({
      samples: [
        {
          row: FIRST_SAMPLE_ROW,
          cells: {
            ...DEFAULTED,
            "Sample #": "1",
            Nature: "Big rock",
            Latitude: "abc",
            "Collection date start": "demain",
          },
          children: [],
        },
        {
          row: FIRST_SAMPLE_ROW + 1,
          cells: { ...DEFAULTED, "Sample #": "1", "Sample name": "Twin" },
          children: [],
        },
        {
          row: FIRST_SAMPLE_ROW + 2,
          cells: { ...DEFAULTED, "Sample name": "Keyless" },
          children: [],
        },
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

  it("should skip the greyed example row", async () => {
    expect(read(await templateBook()).samples).toEqual([]);
  });
});
