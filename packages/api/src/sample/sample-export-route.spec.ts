import type { Kysely } from "kysely";

import { XLSX_MEDIA_TYPE } from "@projet-igsn/domain/sample/import/import-validator";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertOwned } from "../tests/insert-owned.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { SHEETS } from "./import-template/columns.ts";

const ARCHIVE_EMAIL = "archive-export@univ-lorraine.fr";

const exportSample = (db: Kysely<DB>, igsn: string, query = "") =>
  createApp(db).app.request(`/samples/${igsn}/export${query}`);

const loadBook = async (res: Response) => {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await res.arrayBuffer());
  return book;
};

const cellTexts = (book: ExcelJS.Workbook) =>
  book.worksheets.flatMap((sheet) =>
    sheet
      .getSheetValues()
      .flatMap((row) => (Array.isArray(row) ? row : []))
      .map((value) => JSON.stringify(value)),
  );

describe("GET /samples/:igsn/export", () => {
  pgTest(
    "should answer a published sample as an xlsx download named after its IGSN, with no read me sheet",
    async ({ db }) => {
      const owner = await insertUser(db, "sample-export-owner@example.org");
      const sample = await insertParent(db, owner.id);

      const res = await exportSample(db, sample.igsn!);
      const book = await loadBook(res);

      expect({
        status: res.status,
        mediaType: res.headers.get("Content-Type"),
        disposition: res.headers.get("Content-Disposition"),
        row: book.getWorksheet(SHEETS.samples)?.getRow(3).values,
        readMe: book.getWorksheet(SHEETS.readMe),
      }).toEqual({
        status: 200,
        mediaType: XLSX_MEDIA_TYPE,
        disposition: `attachment; filename="igsn-${sample.igsn}.xlsx"`,
        row: expect.arrayContaining([sample.igsn]),
        readMe: undefined,
      });
    },
    30_000,
  );

  pgTest(
    "should answer the sample as a zip of CSV files named after its IGSN with format=csv",
    async ({ db }) => {
      const owner = await insertUser(db, "sample-export-csv@example.org");
      const sample = await insertParent(db, owner.id);

      const res = await exportSample(db, sample.igsn!, "?format=csv");
      const zip = await JSZip.loadAsync(await res.arrayBuffer());

      expect({
        status: res.status,
        mediaType: res.headers.get("Content-Type"),
        disposition: res.headers.get("Content-Disposition"),
        samples: await zip.file("samples.csv")?.async("string"),
      }).toEqual({
        status: 200,
        mediaType: "application/zip",
        disposition: `attachment; filename="igsn-${sample.igsn}.zip"`,
        samples: expect.stringContaining(sample.igsn!),
      });
    },
    30_000,
  );

  pgTest("should refuse an unknown format as 400", async ({ db }) => {
    const res = await exportSample(
      db,
      "0123456789ABCDEFGHJKMNPQRS",
      "?format=pdf",
    );

    expect(res.status).toBe(400);
  });

  pgTest(
    "should leave the archive contact email and its column out of the workbook",
    async ({ db }) => {
      const owner = await insertUser(db, "sample-export-email@example.org");
      const sample = await insertOwned(db, owner.id, {
        repository: {
          ...publishableSample.repository,
          currentArchiveContactEmail: ARCHIVE_EMAIL,
        },
      });

      const texts = cellTexts(
        await loadBook(await exportSample(db, sample.igsn!)),
      );

      expect(
        ["Current archive contact email", ARCHIVE_EMAIL].map((text) =>
          texts.some((cell) => cell.includes(text)),
        ),
      ).toEqual([false, false]);
    },
    30_000,
  );

  pgTest.for(["withdrawn", "embargo", "tombstone"] as const)(
    "should answer a %s sample as 404",
    { timeout: 30_000 },
    async (status, { db }) => {
      const owner = await insertUser(db, `sample-export-${status}@example.org`);
      const sample = await insertParent(db, owner.id, status);

      const res = await exportSample(db, sample.igsn!);

      expect(res.status).toBe(404);
    },
  );

  pgTest("should answer an unknown IGSN as 404", async ({ db }) => {
    const res = await exportSample(db, "0123456789ABCDEFGHJKMNPQRS");

    expect(res.status).toBe(404);
  });
});
