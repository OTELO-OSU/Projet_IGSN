import type { Kysely } from "kysely";

import { eligibleParentsResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertOwned } from "../tests/insert-owned.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { drainPublishingQueue } from "./service/publishing-worker.ts";

type Db = Kysely<DB>;

const authHeader = { Authorization: "Bearer test-token" };

const CORE_SERIES = "serie_of_sample.core";

const search = async (db: Db, query: Record<string, string>) => {
  const res = await testClient(createApp(db).app).admin.samples.children.$get(
    { query },
    { headers: authHeader },
  );
  expect(res.status).toBe(200);
  return eligibleParentsResponseSchema.parse(await res.json()).data;
};

const caller = (db: Db) =>
  provisionUser(db, "test-token", { status: "accepted" }).then(({ id }) => id);

describe("the eligible child search", () => {
  pgTest(
    "should offer only the samples the caller can edit",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const own = await insertOwned(db, ownerId, {
        name: "Carotte 1",
        type: "core",
      });
      const other = await insertUser(db, "other@example.com");
      await insertOwned(db, other.id, { name: "Carotte 2", type: "core" });
      // Act
      const data = await search(db, { search: "Carotte" });
      // Assert
      expect(data.map(({ id }) => id)).toEqual([own.id]);
    },
  );

  pgTest(
    "should answer only the published root samples, whatever their type, but a series",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const eligible = await insertOwned(db, ownerId, {
        name: "Carotte 1",
        type: "core",
      });
      const parent = await insertParent(db, ownerId);
      await insertOwned(
        db,
        ownerId,
        { name: "Carotte 2", type: "core" },
        false,
      );
      const dredge = await insertOwned(db, ownerId, {
        name: "Carotte 3",
        type: "dredge",
      });
      await insertOwned(db, ownerId, { name: "Carotte 4", type: CORE_SERIES });
      await insertOwned(db, ownerId, {
        name: "Carotte 5",
        type: "core",
        parentIds: [parent.id],
      });
      // Act
      const data = await search(db, { search: "Carotte" });
      // Assert
      expect(data.map(({ id }) => id)).toEqual([eligible.id, dredge.id]);
    },
  );

  pgTest(
    "should keep the series' own members and drop another series' members",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const own = await insertOwned(db, ownerId, {
        name: "Carotte 1",
        type: "core",
      });
      const taken = await insertOwned(db, ownerId, {
        name: "Carotte 2",
        type: "core",
      });
      const series = await insertOwned(db, ownerId, {
        name: "Carotte series",
        type: CORE_SERIES,
        childIds: [own.id],
      });
      await insertOwned(db, ownerId, {
        name: "Other series",
        type: CORE_SERIES,
        childIds: [taken.id],
      });
      await drainPublishingQueue(db, null, []);
      // Act
      const data = await search(db, { search: "Carotte", exclude: series.id });
      // Assert
      expect(data.map(({ id }) => id)).toEqual([own.id]);
    },
  );

  pgTest("should answer 401 without a session", async ({ db }) => {
    // Arrange
    const app = createApp(db).app;
    // Act
    const res = await app.request("/admin/samples/children");
    // Assert
    expect(res.status).toBe(401);
  });
});
