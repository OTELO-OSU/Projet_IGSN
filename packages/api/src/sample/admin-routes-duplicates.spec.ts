import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { CheckDuplicatesBody } from "@projet-igsn/domain/sample/sample-validator";
import type { Kysely } from "kysely";

import {
  IMPORT_TEMPLATE_FILENAME,
  XLSX_MEDIA_TYPE,
} from "@projet-igsn/domain/sample/import/import-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import {
  CLEAN_DUPLICATE,
  cleanBook,
} from "./import-template/import-fixture.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";

const authHeader = { Authorization: "Bearer test-token" };

const COLLECTED = {
  ...publishableSample,
  scientificContext: {
    provenanceStatus: "research_project_sample",
    additionalRoles: [],
    collectorFirstname: "Inge",
    collectorLastname: "Lehmann",
  },
} satisfies CreateSample;

const CRITERIA: CheckDuplicatesBody = {
  name: COLLECTED.name,
  material: COLLECTED.material,
  collectorUserId: null,
  collectorFirstname: "Inge",
  collectorLastname: "Lehmann",
};

const checkDuplicates = (db: Kysely<DB>, json: CheckDuplicatesBody) =>
  testClient(createApp(db).app).admin.samples.duplicates.$post(
    { json },
    { headers: authHeader },
  );

describe("POST /admin/samples/duplicates", () => {
  pgTest(
    "should report the published samples matching the criteria, the route taking precedence over the sample id one",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      const created = await insertSample(db, COLLECTED);
      const published = (await publishSample(db, created.id))!;
      // Act
      const res = await checkDuplicates(db, CRITERIA);
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: [
          { id: published.id, igsn: published.igsn, name: published.name },
        ],
      });
    },
  );
});

const checkImportDuplicates = (db: Kysely<DB>, file: File) => {
  const body = new FormData();
  body.append("file", file);
  return createApp(db).app.request("/admin/samples/import/duplicates", {
    method: "POST",
    headers: authHeader,
    body,
  });
};

describe("POST /admin/samples/import/duplicates", () => {
  pgTest(
    "should report the workbook rows matching published samples",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      const created = await insertSample(db, CLEAN_DUPLICATE);
      const published = (await publishSample(db, created.id))!;
      const book = await cleanBook();
      const file = new File(
        [new Uint8Array(await book.xlsx.writeBuffer())],
        IMPORT_TEMPLATE_FILENAME,
        { type: XLSX_MEDIA_TYPE },
      );
      // Act
      const res = await checkImportDuplicates(db, file);
      // Assert
      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 200,
        body: {
          data: [
            {
              row: 3,
              duplicates: [
                {
                  id: published.id,
                  igsn: published.igsn,
                  name: published.name,
                },
              ],
            },
          ],
        },
      });
    },
    30_000,
  );

  pgTest("should refuse a file that is no xlsx workbook", async ({ db }) => {
    // Arrange
    await provisionUser(db, "test-token", { status: "accepted" });
    // Act
    const res = await checkImportDuplicates(
      db,
      new File(["a,b"], "samples.csv", { type: "text/csv" }),
    );
    // Assert
    expect(res.status).toBe(415);
  });
});
