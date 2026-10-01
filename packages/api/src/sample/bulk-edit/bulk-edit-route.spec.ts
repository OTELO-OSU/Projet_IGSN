import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import {
  IMPORT_TEMPLATE_FILENAME,
  XLSX_MEDIA_TYPE,
} from "@projet-igsn/domain/sample/import/import-validator";
import { SYNTHETIC_MATERIAL_ROOT } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import ExcelJS from "exceljs";
import { afterEach, describe, expect, vi } from "vitest";

import type { DB } from "../../db.ts";

import { createApp } from "../../app.ts";
import { insertParent } from "../../tests/insert-parent.ts";
import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { provisionUser } from "../../tests/provision-user.ts";
import { readSample } from "../../tests/read-sample.ts";
import {
  STUB_DATACITE_CONFIG,
  stubDataCite,
} from "../../tests/stub-datacite.ts";
import { SHEETS } from "../import-template/columns.ts";
import { fill } from "../import-template/import-fixture.ts";
import { acquireEditLock } from "../service/acquire-edit-lock.ts";
import { drainPublishingQueue } from "../service/publishing-worker.ts";
import { exportWorkbook } from "./export-workbook.ts";

const ROW = 3;

const NO_DELAYS = [0, 0, 0, 0, 0];

async function upload(
  db: Kysely<DB>,
  samples: Sample[],
  edit: (book: ExcelJS.Workbook) => void = () => undefined,
) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await exportWorkbook(samples));
  edit(book);
  const body = new FormData();
  body.append(
    "file",
    new File(
      [new Uint8Array(await book.xlsx.writeBuffer())],
      IMPORT_TEMPLATE_FILENAME,
      { type: XLSX_MEDIA_TYPE },
    ),
  );
  return createApp(db).app.request("/admin/samples/bulk-edit", {
    method: "POST",
    headers: { Authorization: "Bearer test-token" },
    body,
  });
}

const statusAndLocalId = (db: Kysely<DB>, ids: string[]) =>
  db
    .selectFrom("sample")
    .select(["id", "status", "local_id"])
    .where("id", "in", ids)
    .orderBy("id")
    .execute();

const setLocalId =
  (localId: string, row = ROW) =>
  (book: ExcelJS.Workbook) =>
    fill(book, SHEETS.samples, row, { "Local ID": localId });

type Arranged = { sample: Sample; key?: string };

const UNPUBLISHED_INTERNAL_NUMBER = 900_000_001;

async function numberedDraft(db: Kysely<DB>, ownerId: string, name?: string) {
  const sample = await insertParent(db, ownerId, "draft", name);
  await db
    .updateTable("sample")
    .set({ internal_number: UNPUBLISHED_INTERNAL_NUMBER })
    .where("id", "=", sample.id)
    .execute();
  return { ...sample, internalNumber: UNPUBLISHED_INTERNAL_NUMBER };
}

const ROW_ISSUES: [
  string,
  (db: Kysely<DB>, callerId: string) => Promise<Arranged>,
][] = [
  [
    "unknown_sample",
    async (db, callerId) => ({
      sample: await insertParent(db, callerId),
      key: "sample-999999999",
    }),
  ],
  [
    "unknown_sample",
    async (db, callerId) => ({
      sample: await insertParent(db, callerId, "tombstone"),
    }),
  ],
  [
    "sample_not_published",
    async (db, callerId) => ({ sample: await numberedDraft(db, callerId) }),
  ],
  [
    "sample_not_published",
    async (db, callerId) => ({
      sample: await insertParent(db, callerId, "withdrawn"),
    }),
  ],
  [
    "synthetic_sample",
    async (db, callerId) => {
      const sample = await insertParent(db, callerId);
      await db
        .updateTable("sample")
        .set({ material: SYNTHETIC_MATERIAL_ROOT })
        .where("id", "=", sample.id)
        .execute();
      return { sample };
    },
  ],
  [
    "sample_not_editable",
    async (db, callerId) => {
      const sample = await insertParent(db, callerId);
      await db
        .updateTable("user_sample")
        .set({ role: "contributor" })
        .where("sample_id", "=", sample.id)
        .execute();
      return { sample };
    },
  ],
  [
    "sample_not_editable",
    async (db) => {
      const owner = await insertUser(db, "owner@example.com");
      return { sample: await insertParent(db, owner.id) };
    },
  ],
  [
    "sample_locked",
    async (db, callerId) => {
      const sample = await insertParent(db, callerId);
      const other = await insertUser(db, "other@example.com");
      await acquireEditLock(db, sample.id, other.id);
      return { sample };
    },
  ],
];

describe("POST /admin/samples/bulk-edit", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DATACITE_API_HOST;
  });

  pgTest(
    "should queue every edited sample for republishing, then publish it under the same IGSN and date",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");
      const sample = await insertParent(db, caller.id);

      const res = await upload(db, [sample], setLocalId("EDITED"));
      const queued = await statusAndLocalId(db, [sample.id]);
      stubDataCite(new Response("{}", { status: 201 }));
      await drainPublishingQueue(db, STUB_DATACITE_CONFIG, NO_DELAYS);
      const republished = await readSample(db, sample.id);

      expect({ status: res.status, body: await res.json(), queued }).toEqual({
        status: 200,
        body: { count: 1 },
        queued: [{ id: sample.id, status: "publishing", local_id: "EDITED" }],
      });
      expect(republished).toMatchObject({
        status: "published",
        localId: "EDITED",
        igsn: sample.igsn,
        publishedAt: sample.publishedAt,
      });
    },
    30_000,
  );

  pgTest.for(ROW_ISSUES)(
    "should refuse the row with %s",
    { timeout: 30_000 },
    async ([code, arrange], { db }) => {
      const caller = await provisionUser(db, "test-token");
      const { sample, key } = await arrange(db, caller.id);

      const res = await upload(db, [sample], (book) => {
        if (!key) return;
        fill(book, SHEETS.samples, ROW, { "Sample #": key });
        book.removeWorksheet(book.getWorksheet(SHEETS.rightsHolders)!.id);
      });

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: {
          error: "Invalid import",
          issues: [
            expect.objectContaining({
              sheet: SHEETS.samples,
              row: ROW,
              column: "Sample #",
              code,
            }),
          ],
        },
      });
    },
  );

  pgTest(
    "should write nothing when a single row is refused",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");
      const editable = await insertParent(db, caller.id, "published", "Kept");
      const draft = await numberedDraft(db, caller.id, "Draft");

      const res = await upload(db, [editable, draft], (book) => {
        setLocalId("EDITED", ROW)(book);
        setLocalId("EDITED", ROW + 1)(book);
      });

      expect({
        status: res.status,
        rows: await statusAndLocalId(db, [editable.id, draft.id]),
      }).toEqual({
        status: 422,
        rows: [
          { id: editable.id, status: "published", local_id: null },
          { id: draft.id, status: "draft", local_id: null },
        ].sort((a, b) => a.id.localeCompare(b.id)),
      });
    },
    30_000,
  );

  pgTest(
    "should refuse a changed frozen cell even from a super admin",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token", {
        superAdmin: true,
      });
      const sample = await insertParent(db, caller.id);

      const res = await upload(db, [sample], (book) =>
        fill(book, SHEETS.samples, ROW, { "Collection origin": "purchase" }),
      );

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: {
          error: "Invalid import",
          issues: [
            expect.objectContaining({
              row: ROW,
              column: "Collection origin",
              code: "frozen_field",
            }),
          ],
        },
      });
    },
    30_000,
  );

  pgTest(
    "should refuse a caller who may not publish samples as 403",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token", {
        status: "pending",
      });
      const sample = await insertParent(db, caller.id);

      const res = await upload(db, [sample]);

      expect(res.status).toBe(403);
    },
    30_000,
  );
});
