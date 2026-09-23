import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { CheckDuplicatesBody } from "@projet-igsn/domain/sample/sample-validator";
import type { Kysely } from "kysely";

import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";

const authHeader = { Authorization: "Bearer test-token" };

const COLLECTED = {
  ...publishableSample,
  scientificContext: {
    provenanceStatus: "field_sample",
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
