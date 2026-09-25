import type { Kysely } from "kysely";

import ExcelJS from "exceljs";
import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { createApp } from "../../app.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { MAX_IMPORT_ROWS, SHEETS } from "./columns.ts";

const authHeader = { Authorization: "Bearer test-token" };

const download = (db: Kysely<DB>, query = "") =>
  createApp(db).app.request(`/admin/samples/import-template${query}`, {
    headers: authHeader,
  });

describe("import template route", () => {
  pgTest(
    "should answer the xlsx template numbered up to the import row cap by default",
    async ({ db }) => {
      const res = await download(db);
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(await res.arrayBuffer());

      expect({
        status: res.status,
        mediaType: res.headers.get("Content-Type"),
        disposition: res.headers.get("Content-Disposition"),
        sniff: res.headers.get("X-Content-Type-Options"),
        sampleRows: (book.getWorksheet(SHEETS.samples)?.rowCount ?? 0) - 2,
      }).toEqual({
        status: 200,
        mediaType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        disposition: 'attachment; filename="igsn-sample-import-template.xlsx"',
        sniff: "nosniff",
        sampleRows: MAX_IMPORT_ROWS,
      });
    },
    30_000,
  );

  pgTest("should refuse an anonymous download", async ({ db }) => {
    const res = await createApp(db).app.request(
      "/admin/samples/import-template",
    );

    expect(res.status).toBe(401);
  });

  pgTest.for(["0", "1.5", String(MAX_IMPORT_ROWS + 1)])(
    "should refuse the rows parameter %s",
    async (rows, { db }) => {
      const res = await download(db, `?rows=${rows}`);

      expect(res.status).toBe(400);
    },
  );
});
