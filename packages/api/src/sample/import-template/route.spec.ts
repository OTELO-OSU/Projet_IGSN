import type { Kysely } from "kysely";

import {
  IMPORT_MAX_BYTES,
  IMPORT_TEMPLATE_FILENAME,
  XLSX_MEDIA_TYPE,
} from "@projet-igsn/domain/sample/import/import-validator";
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

const upload = (db: Kysely<DB>, file?: File) => {
  const body = new FormData();
  if (file) {
    body.append("file", file);
  }
  return createApp(db).app.request("/admin/samples/import", {
    method: "POST",
    headers: authHeader,
    body,
  });
};

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

describe("import upload route", () => {
  pgTest(
    "should accept the downloaded template posted back",
    async ({ db }) => {
      const template = await (await download(db)).blob();

      const res = await upload(
        db,
        new File([template], IMPORT_TEMPLATE_FILENAME, {
          type: XLSX_MEDIA_TYPE,
        }),
      );

      expect(res.status).toBe(202);
    },
    30_000,
  );

  pgTest.for([
    ["samples.csv", "text/csv"],
    ["samples.xlsx", "text/csv"],
    ["samples.csv", XLSX_MEDIA_TYPE],
  ] as const)(
    "should refuse the file %s typed %s as 415",
    async ([name, type], { db }) => {
      const res = await upload(db, new File(["a,b"], name, { type }));

      expect(res.status).toBe(415);
    },
  );

  pgTest("should refuse a file over the size cap as 413", async ({ db }) => {
    const res = await upload(
      db,
      new File([new Uint8Array(IMPORT_MAX_BYTES + 1)], "big.xlsx", {
        type: XLSX_MEDIA_TYPE,
      }),
    );

    expect(res.status).toBe(413);
  });

  pgTest("should refuse a missing file as 400", async ({ db }) => {
    const res = await upload(db);

    expect(res.status).toBe(400);
  });

  pgTest("should refuse an anonymous upload", async ({ db }) => {
    const res = await createApp(db).app.request("/admin/samples/import", {
      method: "POST",
      body: new FormData(),
    });

    expect(res.status).toBe(401);
  });
});
