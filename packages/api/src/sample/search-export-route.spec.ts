import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { XLSX_MEDIA_TYPE } from "@projet-igsn/domain/sample/import/import-validator";
import { HEADER_ROW } from "@projet-igsn/domain/sample/import/template-header";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { sampleCsvTables } from "../data-gouv/sample-csv-tables.ts";
import { insertOwned } from "../tests/insert-owned.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { PUBLIC_EXPORT_SAMPLE_COLUMNS } from "./bulk-edit/export-columns.ts";
import { SHEETS } from "./import-template/columns.ts";
import { FIRST_DATA_ROW } from "./import-template/data-range.ts";
import { searchExportLimits } from "./search-export-limit.ts";

const UNKNOWN_IGSN = "0123456789ABCDEFGHJKMNPQRS";

const IGSN_COLUMN =
  PUBLIC_EXPORT_SAMPLE_COLUMNS.findIndex(({ path }) => path === "igsn") + 1;

const exportSamples = (db: Kysely<DB>, query: string) =>
  createApp(db).app.request(`/samples/export?${query}`);

const exportSelection = (db: Kysely<DB>, body: string) =>
  createApp(db).app.request("/samples/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

const legacyIgsn = (index: number) => `CNRS${String(index).padStart(10, "0")}`;

const loadSamplesSheet = async (res: Response) => {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await res.arrayBuffer());
  const sheet = book.getWorksheet(SHEETS.samples)!;
  return {
    headers: sheet.getRow(HEADER_ROW).values,
    igsns: sheet
      .getColumn(IGSN_COLUMN)
      .values.slice(FIRST_DATA_ROW)
      .filter((value) => typeof value === "string")
      .toSorted((a, b) => a.localeCompare(b)),
  };
};

const samplesCsvOf = async (res: Response) =>
  (await JSZip.loadAsync(await res.arrayBuffer()))
    .file("samples.csv")!
    .async("string");

const insertSelection = async (db: Kysely<DB>) => {
  const owner = await insertUser(db, "selection-export-owner@example.org");
  const parent = await insertParent(db, owner.id);
  const subSample = await insertOwned(db, owner.id, {
    parentIds: [parent.id],
    location: undefined,
  });
  const withdrawn = await insertParent(db, owner.id, "withdrawn");
  const exported: Sample[] = [parent, subSample];
  return {
    exported,
    withdrawn,
    body: (format: string) =>
      JSON.stringify({
        format,
        igsns: [parent.igsn, subSample.igsn, withdrawn.igsn, UNKNOWN_IGSN],
      }),
  };
};

const insertPublished = (db: Kysely<DB>, count: number) =>
  db
    .insertInto("sample")
    .values(
      Array.from({ length: count }, (_, index) => ({
        id: crypto.randomUUID(),
        name: `Sample ${index}`,
        igsn: legacyIgsn(index),
        material: publishableSample.material,
        status: "published" as const,
      })),
    )
    .execute();

describe("GET /samples/export", () => {
  pgTest(
    "should answer the published samples matching the search as a dated zip of the open data CSVs",
    async ({ db }) => {
      const owner = await insertUser(db, "search-export-owner@example.org");
      const matching = await insertParent(
        db,
        owner.id,
        "published",
        "Granite rose",
      );
      await insertParent(db, owner.id, "draft", "Granite rose");
      const withdrawn = await insertParent(
        db,
        owner.id,
        "withdrawn",
        "Granite rose",
      );
      const other = await insertParent(
        db,
        owner.id,
        "published",
        "Basalte noir",
      );
      const subSample = await insertOwned(db, owner.id, {
        name: "Granite rose",
        parentIds: [matching.id],
        location: undefined,
      });

      const res = await exportSamples(db, "search=granite");
      const zip = await JSZip.loadAsync(await res.arrayBuffer());
      const samplesCsv = await zip.file("samples.csv")!.async("string");

      expect({
        status: res.status,
        mediaType: res.headers.get("Content-Type"),
        disposition: res.headers.get("Content-Disposition"),
        sniff: res.headers.get("X-Content-Type-Options"),
        files: Object.keys(zip.files),
        rows: samplesCsv.trim().split("\n").length - 1,
        exported: [matching, withdrawn, other, subSample].map(({ igsn }) =>
          samplesCsv.includes(igsn!),
        ),
      }).toEqual({
        status: 200,
        mediaType: "application/zip",
        disposition: expect.stringMatching(
          /^attachment; filename="igsn-samples-\d{4}-\d{2}-\d{2}\.zip"$/,
        ),
        sniff: "nosniff",
        files: [
          "README.txt",
          ...sampleCsvTables([]).map(({ fileName }) => fileName),
        ],
        rows: 1,
        exported: [true, false, false, false],
      });
    },
    30_000,
  );

  pgTest(
    "should answer the published samples matching the search as a dated xlsx with no archive contact email column",
    async ({ db }) => {
      const owner = await insertUser(db, "search-xlsx-owner@example.org");
      const matching = await insertParent(
        db,
        owner.id,
        "published",
        "Granite rose",
      );
      await insertParent(db, owner.id, "published", "Basalte noir");

      const res = await exportSamples(db, "search=granite&format=xlsx");
      const disposition = res.headers.get("Content-Disposition");
      const { headers, igsns } = await loadSamplesSheet(res);

      expect({
        status: res.status,
        mediaType: res.headers.get("Content-Type"),
        disposition,
        igsns,
        archiveEmailColumn: JSON.stringify(headers).includes(
          "Current archive contact email",
        ),
      }).toEqual({
        status: 200,
        mediaType: XLSX_MEDIA_TYPE,
        disposition: expect.stringMatching(
          /^attachment; filename="igsn-samples-\d{4}-\d{2}-\d{2}\.xlsx"$/,
        ),
        igsns: [matching.igsn],
        archiveEmailColumn: false,
      });
    },
    30_000,
  );
});

describe("POST /samples/export", () => {
  pgTest(
    "should zip exactly the checked published samples, sub-samples included, as CSV",
    async ({ db }) => {
      const { exported, withdrawn, body } = await insertSelection(db);

      const res = await exportSelection(db, body("csv"));
      const disposition = res.headers.get("Content-Disposition");
      const samplesCsv = await samplesCsvOf(res);

      expect({
        status: res.status,
        disposition,
        rows: samplesCsv.trim().split("\n").length - 1,
        exported: [...exported, withdrawn].map(({ igsn }) =>
          samplesCsv.includes(igsn!),
        ),
      }).toEqual({
        status: 200,
        disposition: expect.stringMatching(
          /^attachment; filename="igsn-samples-\d{4}-\d{2}-\d{2}\.zip"$/,
        ),
        rows: 2,
        exported: [true, true, false],
      });
    },
    30_000,
  );

  pgTest(
    "should answer exactly the checked published samples, sub-samples included, as xlsx",
    async ({ db }) => {
      const { exported, body } = await insertSelection(db);

      const res = await exportSelection(db, body("xlsx"));
      const disposition = res.headers.get("Content-Disposition");
      const { igsns } = await loadSamplesSheet(res);

      expect({ status: res.status, disposition, igsns }).toEqual({
        status: 200,
        disposition: expect.stringMatching(
          /^attachment; filename="igsn-samples-\d{4}-\d{2}-\d{2}\.xlsx"$/,
        ),
        igsns: exported
          .map(({ igsn }) => igsn!)
          .toSorted((a, b) => a.localeCompare(b)),
      });
    },
    30_000,
  );

  pgTest.for([
    { name: "an empty selection", body: JSON.stringify({ igsns: [] }) },
    { name: "a malformed IGSN", body: JSON.stringify({ igsns: ["nope"] }) },
    { name: "a non-JSON body", body: "not json" },
  ])("should refuse $name as 400", async ({ body }, { db }) => {
    const res = await exportSelection(db, body);

    expect(res.status).toBe(400);
  });
});

describe("export caps", () => {
  pgTest.for([
    { method: "GET", format: "csv" },
    { method: "GET", format: "xlsx" },
    { method: "POST", format: "xlsx" },
  ] as const)(
    "should refuse a $method $format export above its cap as 422",
    { timeout: 30_000 },
    async ({ method, format }, { db }) => {
      const count = searchExportLimits[format] + 1;

      const res =
        method === "GET"
          ? await insertPublished(db, count).then(() =>
              exportSamples(db, `format=${format}`),
            )
          : await exportSelection(
              db,
              JSON.stringify({
                format,
                igsns: Array.from({ length: count }, (_, index) =>
                  legacyIgsn(index),
                ),
              }),
            );

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: {
          error: `Cannot export more than ${searchExportLimits[format]} samples`,
        },
      });
    },
  );
});
