import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { listSamplesResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { setSampleStatus } from "../sample/service/set-sample-status.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { draft, publishableSample } from "../tests/sample-fixtures.ts";
import { hashApiKey } from "./api-key.ts";

const KEY = "9tPqk1n0RmWvJ8LxUeYb3sQaZc7Hd2Fg";

const IN_REACH = "UMR7358";
const OUT_OF_REACH = "UMR5275";

const archivedSample = {
  ...publishableSample,
  repository: {
    ...publishableSample.repository,
    currentArchiveContact: "curator@example.test",
    originalArchiveContact: "origin@example.test",
  },
} satisfies CreateSample;

async function arrangeAccount(db: Kysely<DB>) {
  const owner = await insertUser(db, "jean.martin@univ-lorraine.fr");
  const account = await insertServiceAccount(
    db,
    "Harvester",
    owner.id,
    hashApiKey(KEY),
  );
  await db
    .insertInto("service_account_managed_institutional_group")
    .values({
      service_account_id: account.id,
      kind: "laboratory",
      code: IN_REACH,
    })
    .execute();
  return createApp(db).app;
}

const inLaboratory = (
  db: Kysely<DB>,
  input: CreateSample,
  laboratory: string,
) =>
  insertSample(db, input, {
    institutionalOrganization: null,
    institutionalOsu: null,
    institutionalLaboratory: laboratory,
  });

const listSamples = (
  app: ReturnType<typeof createApp>["app"],
  params: Record<string, string> = {},
) =>
  app.request(
    `/service/samples?${new URLSearchParams({ page: "1", perPage: "10", ...params }).toString()}`,
    { headers: { Authorization: `Bearer ${KEY}` } },
  );

describe("GET /service/samples", () => {
  pgTest(
    "should list a published sample of the account's managed groups, archive contacts included",
    async ({ db }) => {
      // Arrange
      const app = await arrangeAccount(db);
      const sample = await inLaboratory(db, archivedSample, IN_REACH);
      const published = await publishSample(db, sample.id);
      // Act
      const res = await listSamples(app);
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(
        JSON.parse(JSON.stringify({ data: [published], meta: { total: 1 } })),
      );
    },
  );

  pgTest.for(["draft", "withdrawn", "tombstone"] as const)(
    "should omit a %s sample of the account's managed groups",
    async (status, { db }) => {
      // Arrange
      const app = await arrangeAccount(db);
      const sample = await inLaboratory(db, publishableSample, IN_REACH);
      if (status !== "draft") {
        await publishSample(db, sample.id);
        await setSampleStatus(db, sample.id, status);
      }
      // Act
      const res = await listSamples(app);
      // Assert
      expect(listSamplesResponseSchema.parse(await res.json())).toEqual({
        data: [],
        meta: { total: 0 },
      });
    },
  );

  pgTest(
    "should omit a published sample outside the account's managed groups",
    async ({ db }) => {
      // Arrange
      const app = await arrangeAccount(db);
      const sample = await inLaboratory(db, publishableSample, OUT_OF_REACH);
      await publishSample(db, sample.id);
      // Act
      const res = await listSamples(app);
      // Assert
      expect(listSamplesResponseSchema.parse(await res.json())).toEqual({
        data: [],
        meta: { total: 0 },
      });
    },
  );

  pgTest(
    "should window the page while meta.total counts every match",
    async ({ db }) => {
      // Arrange
      const app = await arrangeAccount(db);
      for (let index = 0; index < 11; index += 1) {
        const sample = await inLaboratory(
          db,
          { ...draft, name: `Sample ${index}` },
          IN_REACH,
        );
        await publishSample(db, sample.id);
      }
      // Act
      const res = await listSamples(app, { page: "2" });
      // Assert
      const body = listSamplesResponseSchema.parse(await res.json());
      expect(body.data).toHaveLength(1);
      expect(body.meta.total).toBe(11);
    },
  );

  pgTest("should ignore a status sent by the caller", async ({ db }) => {
    // Arrange
    const app = await arrangeAccount(db);
    const published = await inLaboratory(db, publishableSample, IN_REACH);
    await publishSample(db, published.id);
    await inLaboratory(db, draft, IN_REACH);
    // Act
    const res = await listSamples(app, { status: "draft" });
    // Assert
    const body = listSamplesResponseSchema.parse(await res.json());
    expect(body.data.map((sample) => sample.id)).toEqual([published.id]);
    expect(body.meta.total).toBe(1);
  });

  pgTest.for([
    { rule: "no Authorization header", headers: {}, status: "accepted" },
    {
      rule: "an unknown api key",
      headers: { Authorization: "Bearer nope" },
      status: "accepted",
    },
    {
      rule: "a valid api key whose owner is no longer accepted",
      headers: { Authorization: `Bearer ${KEY}` },
      status: "rejected",
    },
  ] as const)(
    "should answer 403 to $rule",
    async ({ headers, status }, { db }) => {
      // Arrange
      const owner = await insertUser(db, "jean.martin@univ-lorraine.fr", {
        status,
      });
      await insertServiceAccount(db, "Harvester", owner.id, hashApiKey(KEY));
      const { app } = createApp(db);
      // Act
      const res = await app.request("/service/samples", { headers });
      // Assert
      expect(res.status).toBe(403);
    },
  );
});
