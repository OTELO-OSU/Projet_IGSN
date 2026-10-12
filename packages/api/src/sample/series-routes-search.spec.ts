import type { Kysely } from "kysely";

import { eligibleParentsResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertOwned } from "../tests/insert-owned.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";

type Db = Kysely<DB>;

const authHeader = { Authorization: "Bearer test-token" };

const CORE_SERIES = "serie_of_sample.core";

const search = async (db: Db, query: Record<string, string>) => {
  const res = await testClient(createApp(db).app).admin.samples.series.$get(
    { query },
    { headers: authHeader },
  );
  expect(res.status).toBe(200);
  return eligibleParentsResponseSchema.parse(await res.json()).data;
};

const caller = (db: Db) =>
  provisionUser(db, "test-token", { status: "accepted" }).then(({ id }) => id);

describe("the eligible series search", () => {
  pgTest(
    "should offer only the published series the caller can edit",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const own = await insertOwned(db, ownerId, {
        name: "Series 1",
        type: CORE_SERIES,
      });
      const other = await insertUser(db, "other@example.com");
      await insertOwned(db, other.id, { name: "Series 2", type: CORE_SERIES });
      await insertOwned(
        db,
        ownerId,
        { name: "Series 3", type: CORE_SERIES },
        false,
      );
      await insertOwned(db, ownerId, { name: "Series 4", type: "core" });
      // Act
      const data = await search(db, { search: "Series" });
      // Assert
      expect(data.map(({ id }) => id)).toEqual([own.id]);
    },
  );

  pgTest("should answer 401 without a session", async ({ db }) => {
    // Arrange
    const app = createApp(db).app;
    // Act
    const res = await app.request("/admin/samples/series");
    // Assert
    expect(res.status).toBe(401);
  });
});
