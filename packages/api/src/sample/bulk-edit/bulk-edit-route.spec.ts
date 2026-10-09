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
import { insertOwned } from "../../tests/insert-owned.ts";
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
import { deleteColumn, fill } from "../import-template/import-fixture.ts";
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

async function withoutCollector(db: Kysely<DB>, sample: Sample) {
  await db
    .updateTable("sample")
    .set({
      sc_provenance_status: "research_project_sample",
      sc_collection_origin: null,
    })
    .where("id", "=", sample.id)
    .execute();
  return (await readSample(db, sample.id))!;
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

const CHILDREN_HEADER = "Children IGSNs";

const childIdsOf = async (db: Kysely<DB>, id: string) =>
  (await readSample(db, id))!.children.map((child) => child.id);

async function arrangeSeries(db: Kysely<DB>) {
  const caller = await provisionUser(db, "test-token");
  const [first, second, third] = await Promise.all(
    ["Core 1", "Core 2", "Core 3"].map((name) =>
      insertOwned(db, caller.id, { name, type: "core" }),
    ),
  );
  const series = await insertOwned(db, caller.id, {
    name: "Core series",
    type: "serie_of_sample.core",
    childIds: [first!.id, second!.id],
  });
  return { caller, series, first: first!, second: second!, third: third! };
}

describe("a series' children over bulk edit", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DATACITE_API_HOST;
  });

  pgTest(
    "should rewrite the members from an edited children column",
    async ({ db }) => {
      stubDataCite(new Response("{}", { status: 200 }));
      const { series, first, second, third } = await arrangeSeries(db);

      const res = await upload(db, [series], (book) =>
        fill(book, SHEETS.samples, ROW, {
          [CHILDREN_HEADER]: `${second.igsn}, ${third.igsn}`,
        }),
      );

      expect({
        status: res.status,
        children: await childIdsOf(db, series.id),
        statuses: (await statusAndLocalId(db, [first.id, third.id])).map(
          ({ status }) => status,
        ),
      }).toEqual({
        status: 200,
        children: [second.id, third.id],
        statuses: ["published", "published"],
      });
    },
    30_000,
  );

  pgTest(
    "should accept a withdrawn sample as a child",
    async ({ db }) => {
      const { series, second, third } = await arrangeSeries(db);
      await db
        .updateTable("sample")
        .set({ status: "withdrawn" })
        .where("id", "=", third.id)
        .execute();

      const res = await upload(db, [series], (book) =>
        fill(book, SHEETS.samples, ROW, {
          [CHILDREN_HEADER]: `${second.igsn}, ${third.igsn}`,
        }),
      );

      expect({
        status: res.status,
        children: await childIdsOf(db, series.id),
      }).toEqual({ status: 200, children: [second.id, third.id] });
    },
    30_000,
  );

  pgTest.for<{
    rule: string;
    code: string;
    igsnOf: (db: Kysely<DB>, callerId: string) => Promise<string | null>;
  }>([
    {
      rule: "an unknown IGSN",
      code: "child_not_found",
      igsnOf: () => Promise.resolve("ABCDEFGHJKMNPQRSTVWXYZ0123"),
    },
    {
      rule: "a series of samples",
      code: "child_not_eligible",
      igsnOf: async (db, callerId) =>
        (await insertOwned(db, callerId, { type: "serie_of_sample.core" }))
          .igsn,
    },
    {
      rule: "a sample the caller cannot edit",
      code: "child_not_eligible",
      igsnOf: async (db) => {
        const other = await insertUser(db, "other@example.com");
        return (await insertOwned(db, other.id, { type: "core" })).igsn;
      },
    },
  ])(
    "should refuse $rule as a child with $code",
    { timeout: 30_000 },
    async ({ code, igsnOf }, { db }) => {
      const { caller, series } = await arrangeSeries(db);
      const igsn = await igsnOf(db, caller.id);

      const res = await upload(db, [series], (book) =>
        fill(book, SHEETS.samples, ROW, { [CHILDREN_HEADER]: igsn }),
      );

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: {
          error: "Invalid import",
          issues: [
            expect.objectContaining({
              row: ROW,
              column: CHILDREN_HEADER,
              code,
            }),
          ],
        },
      });
    },
  );

  pgTest(
    "should refuse a child two series rows name",
    async ({ db }) => {
      const { caller, series, third } = await arrangeSeries(db);
      const other = await insertOwned(db, caller.id, {
        name: "Other core series",
        type: "serie_of_sample.core",
      });

      const res = await upload(db, [series, other], (book) => {
        for (const row of [ROW, ROW + 1])
          fill(book, SHEETS.samples, row, { [CHILDREN_HEADER]: third.igsn });
      });

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: {
          error: "Invalid import",
          issues: [ROW, ROW + 1].map((row) =>
            expect.objectContaining({
              row,
              column: CHILDREN_HEADER,
              code: "child_in_several_rows",
            }),
          ),
        },
      });
    },
    30_000,
  );

  pgTest(
    "should keep a member another bulk edit queued for publication",
    async ({ db }) => {
      const { series, first, second } = await arrangeSeries(db);
      await db
        .updateTable("sample")
        .set({ status: "publishing" })
        .where("id", "=", first.id)
        .execute();

      const res = await upload(db, [series], (book) => {
        deleteColumn(book, SHEETS.samples, CHILDREN_HEADER);
        setLocalId("EDITED")(book);
      });

      expect({
        status: res.status,
        children: await childIdsOf(db, series.id),
      }).toEqual({ status: 200, children: [first.id, second.id] });
    },
    30_000,
  );

  pgTest(
    "should refuse the series type on a parent and on its sub-sample",
    async ({ db }) => {
      stubDataCite(new Response("{}", { status: 200 }));
      const caller = await provisionUser(db, "test-token");
      const parent = await insertOwned(db, caller.id, { type: "core" });
      const subSample = await insertOwned(db, caller.id, {
        type: "core",
        parentIds: [parent.id],
        location: undefined,
      });
      const toSeries = {
        "Sample type (level 1)": "Series of samples",
        "Sample type (level 2)": "Core",
      };

      const res = await upload(
        db,
        [(await readSample(db, parent.id))!, subSample],
        (book) => {
          fill(book, SHEETS.samples, ROW, toSeries);
          fill(book, SHEETS.samples, ROW + 1, toSeries);
        },
      );

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: {
          error: "Invalid import",
          issues: [ROW, ROW + 1].map((row) =>
            expect.objectContaining({
              row,
              column: "Sample type (level 1)",
              code: "series_in_lineage",
            }),
          ),
        },
      });
    },
    30_000,
  );

  pgTest(
    "should keep a current child across a sub-type change",
    async ({ db }) => {
      const { series, first } = await arrangeSeries(db);

      const res = await upload(db, [series], (book) =>
        fill(book, SHEETS.samples, ROW, {
          "Sample type (level 2)": "Dredge",
          [CHILDREN_HEADER]: first.igsn,
        }),
      );

      expect({
        status: res.status,
        type: (await readSample(db, series.id))!.type,
        children: await childIdsOf(db, series.id),
      }).toEqual({
        status: 200,
        type: "serie_of_sample.dredge",
        children: [first.id],
      });
    },
    30_000,
  );

  pgTest(
    "should keep the members when the children column is absent",
    async ({ db }) => {
      const { series, first, second } = await arrangeSeries(db);

      const res = await upload(db, [series], (book) => {
        deleteColumn(book, SHEETS.samples, CHILDREN_HEADER);
        setLocalId("EDITED")(book);
      });

      expect({
        status: res.status,
        children: await childIdsOf(db, series.id),
      }).toEqual({ status: 200, children: [first.id, second.id] });
    },
    30_000,
  );
});

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

  pgTest(
    "should save a sample past a blocker it already had when published",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");
      const sample = await withoutCollector(
        db,
        await insertParent(db, caller.id),
      );

      const res = await upload(db, [sample], setLocalId("EDITED"));

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 200,
        body: { count: 1 },
      });
    },
    30_000,
  );

  pgTest(
    "should refuse a blocker the edit introduces next to one the sample already had",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");
      const sample = await withoutCollector(
        db,
        await insertParent(db, caller.id),
      );

      const res = await upload(db, [sample], (book) =>
        fill(book, SHEETS.samples, ROW, { "Existence status": null }),
      );

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: {
          error: "Invalid import",
          issues: [
            expect.objectContaining({
              row: ROW,
              column: "Existence status",
              code: "existence_status_missing",
            }),
          ],
        },
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
