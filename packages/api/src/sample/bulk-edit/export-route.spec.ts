import type { Kysely } from "kysely";

import { XLSX_MEDIA_TYPE } from "@projet-igsn/domain/sample/import/import-validator";
import ExcelJS from "exceljs";
import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { createApp } from "../../app.ts";
import { insertParent } from "../../tests/insert-parent.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { provisionUser } from "../../tests/provision-user.ts";
import { SHEETS } from "../import-template/columns.ts";

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
        igsn: book.getWorksheet(SHEETS.samples)?.getCell("A3").value,
      }).toEqual({
        status: 200,
        mediaType: XLSX_MEDIA_TYPE,
        disposition: expect.stringMatching(
          /^attachment; filename="igsn-samples-export-\d{4}-\d{2}-\d{2}\.xlsx"$/,
        ),
        sniff: "nosniff",
        igsn: sample.igsn,
      });
    },
    30_000,
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
