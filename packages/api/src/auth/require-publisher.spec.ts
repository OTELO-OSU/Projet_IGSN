import type { Kysely } from "kysely";

import { sql } from "kysely";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { stagingDirOf } from "../staged-upload/staged-path.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";

const attachmentsDir = await mkdtemp(join(tmpdir(), "require-publisher-"));

afterAll(() => rm(attachmentsDir, { recursive: true, force: true }));

const UPLOADS = "/admin/samples/import/uploads/";
const UNKNOWN_UPLOAD = crypto.randomUUID();

const json = (body: unknown) => ({
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const tus = (headers: Record<string, string> = {}) => ({
  headers: { "Tus-Resumable": "1.0.0", ...headers },
});

type Init = { headers?: Record<string, string>; body?: RequestInit["body"] };

const request = (
  db: Kysely<DB>,
  method: string,
  path: string,
  { headers = {}, body }: Init,
) =>
  createApp(db, { attachmentsDir }).app.request(path, {
    method,
    headers: { Authorization: "Bearer test-token", ...headers },
    body,
  });

const drawInternalNumber = async (db: Kysely<DB>) =>
  (
    await sql<{
      n: string;
    }>`select nextval('sample_internal_number_seq') as n`.execute(db)
  ).rows[0]!.n;

const sessionInternalNumber = async (db: Kysely<DB>) =>
  (
    await sql<{
      n: string;
    }>`select currval('sample_internal_number_seq') as n`.execute(db)
  ).rows[0]!.n;

const stagedFiles = () =>
  readdir(stagingDirOf(attachmentsDir)).catch(() => [] as string[]);

describe("import area for publishers only", () => {
  pgTest.for<[string, string, Init]>([
    ["GET", "/admin/samples/import-template", {}],
    ["POST", "/admin/samples/import-template/reservation", json({ count: 1 })],
    ["POST", "/admin/samples/import", { body: new FormData() }],
    ["POST", "/admin/samples/import/duplicates", { body: new FormData() }],
    [
      "POST",
      "/admin/samples/import/internal-id-request",
      json({ internalIds: ["sample-12"] }),
    ],
    [
      "POST",
      UPLOADS,
      tus({
        "Upload-Length": "3",
        "Upload-Metadata": `filename ${btoa("report.pdf")},filetype ${btoa("application/pdf")}`,
      }),
    ],
    ["PATCH", `${UPLOADS}${UNKNOWN_UPLOAD}`, tus({ "Upload-Offset": "0" })],
    ["HEAD", `${UPLOADS}${UNKNOWN_UPLOAD}`, tus()],
    ["GET", `${UPLOADS}${UNKNOWN_UPLOAD}`, tus()],
    ["DELETE", `${UPLOADS}${UNKNOWN_UPLOAD}`, tus()],
    ["POST", "/admin/samples/bulk-edit", { body: new FormData() }],
  ])(
    "should refuse %s %s to a pending user, writing nothing",
    async ([method, path, init], { db }) => {
      await provisionUser(db, "test-token", { status: "pending" });
      const before = await drawInternalNumber(db);

      const res = await request(db, method, path, init);

      expect({
        status: res.status,
        body: method === "HEAD" ? null : await res.json(),
        internalNumber: await sessionInternalNumber(db),
        samples: (await db.selectFrom("sample").select("id").execute()).length,
        staged: await stagedFiles(),
      }).toEqual({
        status: 403,
        body: method === "HEAD" ? null : { error: "Forbidden" },
        internalNumber: before,
        samples: 0,
        staged: [],
      });
    },
  );

  pgTest(
    "should let a pending super admin reserve internal IDs",
    async ({ db }) => {
      await provisionUser(db, "test-token", {
        status: "pending",
        superAdmin: true,
      });

      const res = await request(
        db,
        "POST",
        "/admin/samples/import-template/reservation",
        json({ count: 1 }),
      );

      expect(res.status).toBe(200);
    },
    30_000,
  );
});
