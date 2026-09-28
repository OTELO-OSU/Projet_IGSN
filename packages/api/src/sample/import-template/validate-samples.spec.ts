import type ExcelJS from "exceljs";

import { describe, expect, it } from "vitest";

import { buildSampleInputs } from "./build-sample-inputs.ts";
import { SHEETS } from "./columns.ts";
import { cleanBook, deleteColumn, fill } from "./import-fixture.ts";
import { readRows } from "./read-rows.ts";
import { templateLayout } from "./template-layout.ts";
import { validateSamples } from "./validate-samples.ts";

const issuesOf = (book: ExcelJS.Workbook) =>
  validateSamples(
    buildSampleInputs(readRows(book, templateLayout(book).layout)).samples,
  );

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

describe("validateSamples", () => {
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
          message: expect.any(String),
        },
      ],
    ],
    [
      "a filled cell the sample's provenance branch drops",
      (book) => {
        fill(book, SHEETS.samples, 4, {
          ...COLLECTION_SPECIMEN,
          "Collection origin": "scientific_expedition",
        });
        fill(book, SHEETS.funderOrganizations, 3, {
          "Sample #": 2,
          "Funder organization": "03fd77x13",
        });
      },
      [
        {
          sheet: SHEETS.funderOrganizations,
          row: 3,
          column: "Funder organization",
          code: "not_applicable",
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
    [
      "a publish blocker behind a schema error that aborts the sample",
      (book) =>
        fill(book, SHEETS.samples, 3, { Name: null, "Existence status": null }),
      [
        {
          sheet: SHEETS.samples,
          row: 3,
          column: "Name",
          code: "invalid_type",
          message: expect.any(String),
        },
        {
          sheet: SHEETS.samples,
          row: 3,
          column: "Existence status",
          code: "existence_status_missing",
        },
      ],
    ],
    [
      "no publish blocker on a field a schema error already names",
      (book) => fill(book, SHEETS.samples, 3, { Name: null, Latitude: 95 }),
      [
        {
          sheet: SHEETS.samples,
          row: 3,
          column: "Name",
          code: "invalid_type",
          message: expect.any(String),
        },
        {
          sheet: SHEETS.samples,
          row: 3,
          column: "Latitude",
          code: "too_big",
          message: expect.any(String),
        },
      ],
    ],
    [
      "no publish blocker on a field whose sibling fails its own parse",
      (book) =>
        fill(book, SHEETS.additionalRoles, 3, {
          "Sample #": 1,
          Role: "Unknown role",
          "First name": "Ada",
          "Last name": "Lovelace",
        }),
      [
        {
          sheet: SHEETS.additionalRoles,
          row: 3,
          column: "Role",
          code: "invalid_value",
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
