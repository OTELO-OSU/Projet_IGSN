import type { Kysely } from "kysely";

import {
  IMPORT_MAX_BYTES,
  IMPORT_TEMPLATE_FILENAME,
  XLSX_MEDIA_TYPE,
} from "@projet-igsn/domain/sample/import/import-validator";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import ExcelJS from "exceljs";
import { afterEach, describe, expect, vi } from "vitest";

import type { DB } from "../../db.ts";

import { createApp } from "../../app.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { provisionUser } from "../../tests/provision-user.ts";
import { stubDataCite } from "../../tests/stub-datacite.ts";
import { createSampleRepository } from "../repository.ts";
import { SHEETS } from "./columns.ts";
import {
  CLEAN_SAMPLE,
  cleanBook,
  columnOf,
  fill,
  sheetOf,
} from "./import-fixture.ts";

const authHeader = { Authorization: "Bearer test-token" };

const GROUP = { id: "01890a5d-ac96-774b-82d4-b302099a9f11", name: "Alps 2026" };

const download = (db: Kysely<DB>, query = "") =>
  createApp(db).app.request(`/admin/samples/import-template${query}`, {
    headers: authHeader,
  });

const reserve = (db: Kysely<DB>, body: unknown, headers = authHeader) =>
  createApp(db).app.request("/admin/samples/import-template/reservation", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body),
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

  pgTest.for([
    "rows=0",
    "rows=1.5",
    `rows=${MAX_IMPORT_ROWS + 1}`,
    "provenanceStatus=lost",
    "materialPath=rock_and_sediment.mineral",
    "materialPath=rock_and_sediment.nope",
    `manualGroupIds=${GROUP.id},nope`,
  ])("should refuse the parameter %s", async (query, { db }) => {
    const res = await download(db, `?${query}`);

    expect(res.status).toBe(400);
  });

  pgTest(
    "should answer 422 for a manual group the caller cannot attach",
    async ({ db }) => {
      await provisionUser(db, "test-token", { status: "accepted" });
      await db.insertInto("manual_group").values(GROUP).execute();

      const res = await download(db, `?manualGroupIds=${GROUP.id}`);

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: { error: "Manual group not attachable to this sample" },
      });
    },
  );

  pgTest(
    "should answer the template customized with the requested pre-fills and groups",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      await db.insertInto("manual_group").values(GROUP).execute();
      await db
        .insertInto("manual_group_member")
        .values({ group_id: GROUP.id, user_id: caller.id })
        .execute();

      const res = await download(
        db,
        `?rows=1&provenanceStatus=field_sample&materialPath=rock_and_sediment.rock.igneous&manualGroupIds=${GROUP.id}`,
      );
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(await res.arrayBuffer());
      const samples = sheetOf(book, SHEETS.samples);
      const prefillOf = (header: string) =>
        samples.getCell(3, columnOf(samples, header)).value;

      expect({
        status: res.status,
        provenance: prefillOf("Provenance status"),
        material: prefillOf("Material (level 3)"),
        groups: sheetOf(book, SHEETS.readMe).getCell("C2").value,
      }).toEqual({
        status: 200,
        provenance: "Field sample",
        material: "Igneous",
        groups: GROUP.name,
      });
    },
    30_000,
  );
});

describe("import template reservation route", () => {
  pgTest(
    "should answer a template of the requested rows, each Sample # holding its reserved internal ID",
    async ({ db }) => {
      const res = await reserve(db, { count: 3 });
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(await res.arrayBuffer());
      const samples = book.getWorksheet(SHEETS.samples)!;
      const internalIds = [3, 4, 5].map((row) =>
        Number(samples.getCell(row, 1).text.replace("sample-", "")),
      );

      expect({
        status: res.status,
        sampleRows: samples.rowCount - 2,
        consecutive: internalIds.map((n) => n - internalIds[0]!),
      }).toEqual({ status: 200, sampleRows: 3, consecutive: [0, 1, 2] });
    },
    30_000,
  );

  pgTest("should refuse an anonymous reservation", async ({ db }) => {
    const res = await reserve(db, { count: 3 }, {} as typeof authHeader);

    expect(res.status).toBe(401);
  });

  pgTest.for([0, MAX_IMPORT_ROWS + 1])(
    "should refuse reserving %d internal IDs",
    async (count, { db }) => {
      const res = await reserve(db, { count });

      expect(res.status).toBe(400);
    },
  );

  pgTest(
    "should answer the reserved template customized with the requested pre-fills and groups",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      await db.insertInto("manual_group").values(GROUP).execute();
      await db
        .insertInto("manual_group_member")
        .values({ group_id: GROUP.id, user_id: caller.id })
        .execute();

      const res = await reserve(db, {
        count: 2,
        provenanceStatus: "field_sample",
        materialPath: "rock_and_sediment.rock.igneous",
        manualGroupIds: [GROUP.id],
      });
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(await res.arrayBuffer());
      const samples = sheetOf(book, SHEETS.samples);
      const internalIds = [3, 4].map((row) =>
        Number(samples.getCell(row, 1).text.replace("sample-", "")),
      );
      const prefillOf = (header: string) =>
        samples.getCell(3, columnOf(samples, header)).value;

      expect({
        status: res.status,
        consecutive: internalIds.map((n) => n - internalIds[0]!),
        provenance: prefillOf("Provenance status"),
        material: prefillOf("Material (level 3)"),
        groups: sheetOf(book, SHEETS.readMe).getCell("C2").value,
      }).toEqual({
        status: 200,
        consecutive: [0, 1],
        provenance: "Field sample",
        material: "Igneous",
        groups: GROUP.name,
      });
    },
    30_000,
  );

  pgTest(
    "should answer 422 for a reserved template naming a manual group the caller cannot attach",
    async ({ db }) => {
      await provisionUser(db, "test-token", { status: "accepted" });
      await db.insertInto("manual_group").values(GROUP).execute();

      const res = await reserve(db, { count: 1, manualGroupIds: [GROUP.id] });

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: { error: "Manual group not attachable to this sample" },
      });
    },
  );

  pgTest(
    "should refuse reserving a template pre-filled with a mineral material",
    async ({ db }) => {
      const res = await reserve(db, {
        count: 1,
        materialPath: "rock_and_sediment.mineral",
      });

      expect(res.status).toBe(400);
    },
  );
});

const cleanFile = async () =>
  new File(
    [new Uint8Array(await (await cleanBook()).xlsx.writeBuffer())],
    IMPORT_TEMPLATE_FILENAME,
    { type: XLSX_MEDIA_TYPE },
  );

const queuedSamples = (db: Kysely<DB>) =>
  db
    .selectFrom("sample")
    .innerJoin("user_sample", "user_sample.sample_id", "sample.id")
    .select(["sample.status", "user_sample.user_id", "user_sample.role"])
    .execute();

describe("import upload route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DATACITE_API_HOST;
  });

  pgTest(
    "should queue every sample of a publishable file for publishing under the caller",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");

      const res = await upload(db, await cleanFile());

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 200,
        body: { count: 1 },
      });
      expect(await queuedSamples(db)).toEqual([
        { status: "publishing", user_id: caller.id, role: "owner" },
      ]);
    },
    30_000,
  );

  pgTest(
    "should queue a sample under the internal ID reserved in its Sample #",
    async ({ db }) => {
      await provisionUser(db, "test-token");
      const [reserved] =
        await createSampleRepository(db).reserveInternalNumbers(1);
      const book = await cleanBook();
      fill(book, SHEETS.samples, 4, {
        ...CLEAN_SAMPLE,
        "Sample #": `sample-${reserved}`,
      });

      const res = await upload(
        db,
        new File(
          [new Uint8Array(await book.xlsx.writeBuffer())],
          IMPORT_TEMPLATE_FILENAME,
          { type: XLSX_MEDIA_TYPE },
        ),
      );

      expect({
        status: res.status,
        internalNumbers: (
          await db
            .selectFrom("sample")
            .select("internal_number")
            .where("status", "=", "publishing")
            .orderBy("internal_number")
            .execute()
        ).map(({ internal_number }) => internal_number),
      }).toEqual({ status: 200, internalNumbers: [reserved, null] });
    },
    30_000,
  );

  pgTest(
    "should answer 503 and queue nothing when DataCite does not answer",
    async ({ db }) => {
      stubDataCite(new Response("", { status: 503 }));

      const res = await upload(db, await cleanFile());

      expect(res.status).toBe(503);
      expect(await queuedSamples(db)).toEqual([]);
    },
    30_000,
  );

  pgTest(
    "should refuse the downloaded template posted back empty with its issues",
    async ({ db }) => {
      const template = await (await download(db)).blob();

      const res = await upload(
        db,
        new File([template], IMPORT_TEMPLATE_FILENAME, {
          type: XLSX_MEDIA_TYPE,
        }),
      );

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: {
          error: "Invalid import",
          issues: [{ sheet: SHEETS.samples, code: "no_sample" }],
        },
      });
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
