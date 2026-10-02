import type { Kysely } from "kysely";

import { ATTACHMENT_MAX_BYTES } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { STAGED_UPLOAD_QUOTA_BYTES } from "@projet-igsn/domain/staged-upload/limits";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { seedStagedUpload } from "../tests/seed-staged-upload.ts";

const UPLOADS = "/admin/samples/import/uploads/";

const storageDir = await mkdtemp(join(tmpdir(), "staged-upload-routes-"));

afterAll(() => rm(storageDir, { recursive: true, force: true }));

const tus = (
  db: Kysely<DB>,
  path: string,
  {
    headers,
    ...init
  }: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
  token = "test-token",
) =>
  createApp(db, { attachmentsDir: storageDir }).app.request(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Tus-Resumable": "1.0.0",
      ...headers,
    },
  });

const create = (db: Kysely<DB>, size: number, token?: string) =>
  tus(
    db,
    UPLOADS,
    {
      method: "POST",
      headers: {
        "Upload-Length": String(size),
        "Upload-Metadata": `filename ${btoa("report.pdf")},filetype ${btoa("application/pdf")}`,
      },
    },
    token,
  );

const createdId = async (db: Kysely<DB>, size: number) =>
  (await create(db, size)).headers.get("Location") ?? "";

const patch = (db: Kysely<DB>, id: string, body: Uint8Array) =>
  tus(db, `${UPLOADS}${id}`, {
    method: "PATCH",
    headers: {
      "Upload-Offset": "0",
      "Content-Type": "application/offset+octet-stream",
    },
    body,
  });

describe("staged upload routes", () => {
  pgTest(
    "should create an upload answering its bare id as Location",
    async ({ db }) => {
      await provisionUser(db, "test-token");

      const res = await create(db, 4);

      expect({
        status: res.status,
        location: res.headers.get("Location"),
      }).toEqual({
        status: 201,
        location: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
      });
    },
  );

  pgTest("should refuse an anonymous upload", async ({ db }) => {
    const res = await createApp(db, { attachmentsDir: storageDir }).app.request(
      UPLOADS,
      {
        method: "POST",
        headers: { "Tus-Resumable": "1.0.0", "Upload-Length": "4" },
      },
    );

    expect(res.status).toBe(401);
  });

  pgTest.for([
    {
      kind: "the attachment size cap",
      staged: 0,
      size: ATTACHMENT_MAX_BYTES + 1,
    },
    { kind: "the staging quota", staged: STAGED_UPLOAD_QUOTA_BYTES, size: 1 },
  ])(
    "should refuse an upload over $kind as 413",
    async ({ staged, size }, { db }) => {
      const { id } = await provisionUser(db, "test-token");
      await seedStagedUpload(storageDir, {
        ownerId: id,
        size: staged,
        written: 0,
      });

      const res = await create(db, size);

      expect(res.status).toBe(413);
    },
  );

  pgTest(
    "should refuse an upload deferring its length, which the quota needs",
    async ({ db }) => {
      await provisionUser(db, "test-token");

      const res = await tus(db, UPLOADS, {
        method: "POST",
        headers: { "Upload-Defer-Length": "1" },
      });

      expect(res.status).toBe(400);
    },
  );

  pgTest.for(["PATCH", "HEAD", "DELETE"])(
    "should hide another user's upload from %s as 404, whatever owner id the client claims",
    async (method, { db }) => {
      const owner = await provisionUser(db, "test-token");
      await provisionUser(db, "other-token");
      const id = await createdId(db, 4);

      const res = await tus(
        db,
        `${UPLOADS}${id}`,
        {
          method,
          headers: {
            "x-owner-id": owner.id,
            "Upload-Offset": "0",
            "Content-Type": "application/offset+octet-stream",
          },
          body: method === "PATCH" ? new Uint8Array(4) : undefined,
        },
        "other-token",
      );
      const ownerView = await tus(db, `${UPLOADS}${id}`, { method: "HEAD" });

      expect({
        status: res.status,
        ownerView: ownerView.status,
        ownerOffset: ownerView.headers.get("Upload-Offset"),
      }).toEqual({ status: 404, ownerView: 200, ownerOffset: "0" });
    },
  );

  pgTest(
    "should accept the owner's chunks up to the upload size",
    async ({ db }) => {
      await provisionUser(db, "test-token");
      const id = await createdId(db, 4);

      const res = await patch(db, id, new Uint8Array([1, 2, 3, 4]));

      expect({
        status: res.status,
        offset: res.headers.get("Upload-Offset"),
      }).toEqual({ status: 204, offset: "4" });
    },
  );
});
