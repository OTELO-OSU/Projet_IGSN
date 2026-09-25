import type ExcelJS from "exceljs";

import { describe, expect, it } from "vitest";

import { SHEETS } from "./columns.ts";
import { cleanBook, deleteColumn, fill } from "./import-fixture.ts";
import { readRows } from "./read-rows.ts";
import { sampleIssues } from "./sample-issues.ts";
import { templateLayout } from "./template-layout.ts";

const issuesOf = (book: ExcelJS.Workbook) =>
  sampleIssues(readRows(book, templateLayout(book).layout).samples);

const COLLECTION_SPECIMEN = {
  Name: "Specimen 2",
  "Sample type (level 1)": "Individual sample",
  Nature: "Hand sample",
  "Material (level 1)": "Rock and sediment",
  "Material (level 2)": "Rock",
  "Material (level 3)": "Igneous",
  "Provenance status": "Collection specimen",
  "Collection date precision": "Day",
  "Collection date start": "2024-01-10",
  "Collection date end": "2024-01-10",
  "Existence status": "Exists",
  "Availability status": "Available",
};

describe("sampleIssues", () => {
  it("should find nothing to report on a publishable file", async () => {
    expect(issuesOf(await cleanBook())).toEqual([]);
  });

  it.each<[string, (book: ExcelJS.Workbook) => void, object[]]>([
    [
      "a publish blocker on the column that clears it",
      (book) => fill(book, SHEETS.samples, 3, { "Existence status": null }),
      [
        {
          sheet: SHEETS.samples,
          row: 3,
          column: "Existence status",
          code: "existence_status_missing",
        },
      ],
    ],
    [
      "a deleted conditional column on the only row that needs it",
      (book) => {
        fill(book, SHEETS.samples, 4, COLLECTION_SPECIMEN);
        deleteColumn(book, SHEETS.samples, "Collection origin");
      },
      [
        {
          sheet: SHEETS.samples,
          row: 4,
          column: "Collection origin",
          code: "collection_origin_missing",
        },
      ],
    ],
    [
      "a child-row rule on the sheet and row that fed it",
      (book) => fill(book, SHEETS.relations, 3, { Identifier: "not a doi" }),
      [
        {
          sheet: SHEETS.relations,
          row: 3,
          column: "Identifier",
          code: "relation_identifier_doi",
        },
      ],
    ],
    [
      "a schema check with its message",
      (book) => fill(book, SHEETS.samples, 3, { Latitude: 95 }),
      [
        {
          sheet: SHEETS.samples,
          row: 3,
          column: "Latitude",
          code: "too_big",
          message: expect.any(String),
        },
      ],
    ],
  ])("should report %s", async (_, edit, expected) => {
    const book = await cleanBook();
    edit(book);

    expect(issuesOf(book)).toEqual(expected);
  });
});
