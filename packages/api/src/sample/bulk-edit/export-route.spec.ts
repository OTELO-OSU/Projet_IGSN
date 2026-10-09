import type { Kysely } from "kysely";

import { XLSX_MEDIA_TYPE } from "@projet-igsn/domain/sample/import/import-validator";
import ExcelJS from "exceljs";
import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { createApp } from "../../app.ts";
import { insertOwned } from "../../tests/insert-owned.ts";
import { insertParent } from "../../tests/insert-parent.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { provisionUser } from "../../tests/provision-user.ts";
import {
  CHILDREN_IGSNS_HEADER,
  SERIES_IGSN_HEADER,
  SHEETS,
} from "../import-template/columns.ts";

const exportSamples = (
  db: Kysely<DB>,
  body: unknown,
  headers: Record<string, string> = { Authorization: "Bearer test-token" },
) =>
  createApp(db).app.request("/admin/samples/export", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /admin/samples/export", () => {
  pgTest(
    "should answer the checked samples as a dated xlsx download",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");
      const sample = await insertParent(db, caller.id);

      const res = await exportSamples(db, {
        mode: "ids",
        moderated: false,
        ids: [sample.id],
      });
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(await res.arrayBuffer());

      expect({
        status: res.status,
        mediaType: res.headers.get("Content-Type"),
        disposition: res.headers.get("Content-Disposition"),
        sniff: res.headers.get("X-Content-Type-Options"),
        key: book.getWorksheet(SHEETS.samples)?.getCell("A3").value,
      }).toEqual({
        status: 200,
        mediaType: XLSX_MEDIA_TYPE,
        disposition: expect.stringMatching(
          /^attachment; filename="igsn-samples-export-\d{4}-\d{2}-\d{2}\.xlsx"$/,
        ),
        sniff: "nosniff",
        key: `sample-${sample.internalNumber}`,
      });
    },
    30_000,
  );

  pgTest.for([
    { header: CHILDREN_IGSNS_HEADER, exported: "series", named: "child" },
    { header: SERIES_IGSN_HEADER, exported: "child", named: "series" },
  ] as const)(
    "should export the $named IGSN of a $exported under $header",
    { timeout: 30_000 },
    async ({ header, exported, named }, { db }) => {
      const caller = await provisionUser(db, "test-token");
      const child = await insertOwned(db, caller.id, { type: "core" });
      const series = await insertOwned(db, caller.id, {
        type: "serie_of_sample.core",
        childIds: [child.id],
      });
      const linked = { child, series };

      const res = await exportSamples(db, {
        mode: "ids",
        moderated: false,
        ids: [linked[exported].id],
      });
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(await res.arrayBuffer());
      const sheet = book.getWorksheet(SHEETS.samples)!;
      const column = [1, 2]
        .map((row) => (sheet.getRow(row).values as unknown[]).indexOf(header))
        .find((index) => index > 0)!;

      expect(sheet.getRow(3).getCell(column).value).toBe(linked[named].igsn);
    },
  );

  pgTest("should refuse an invalid body as 400", async ({ db }) => {
    const res = await exportSamples(db, {
      mode: "ids",
      moderated: false,
      ids: [],
    });

    expect(res.status).toBe(400);
  });

  pgTest("should refuse an anonymous export as 401", async ({ db }) => {
    const res = await exportSamples(
      db,
      { mode: "filters", moderated: false, query: {} },
      {},
    );

    expect(res.status).toBe(401);
  });

  pgTest(
    "should refuse a moderated export to a user without moderation scope as 403",
    async ({ db }) => {
      const res = await exportSamples(db, {
        mode: "filters",
        moderated: true,
        query: {},
      });

      expect(res.status).toBe(403);
    },
  );
});
