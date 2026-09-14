import type { Kysely } from "kysely";

import { eligibleParentsResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";

type Db = Kysely<DB>;

const authHeader = { Authorization: "Bearer test-token" };

const search = async (db: Db, query: Record<string, string>) => {
  const res = await testClient(createApp(db).app).admin.samples.parents.$get(
    { query },
    { headers: authHeader },
  );
  expect(res.status).toBe(200);
  return eligibleParentsResponseSchema.parse(await res.json()).data;
};

describe("the eligible parent search", () => {
  pgTest.for([
    { status: "published" as const, found: true },
    { status: "draft" as const, found: false },
    { status: "withdrawn" as const, found: false },
    { status: "tombstone" as const, found: false },
  ])(
    "should report finding a stranger's $status sample as $found",
    async ({ status, found }, { db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      const stranger = await insertUser(db, "stranger@univ-lorraine.fr");
      const sample = await insertParent(
        db,
        stranger.id,
        status,
        "Gabbro des Vosges",
      );
      // Act
      const data = await search(db, { search: "Gabbro" });
      // Assert
      expect(data.map((parent) => parent.id)).toEqual(found ? [sample.id] : []);
    },
  );

  pgTest("should find the caller's own withdrawn sample", async ({ db }) => {
    // Arrange
    const caller = await provisionUser(db, "test-token", {
      status: "accepted",
    });
    const sample = await insertParent(
      db,
      caller.id,
      "withdrawn",
      "Gabbro des Vosges",
    );
    // Act
    const data = await search(db, { search: "Gabbro" });
    // Assert
    expect(data).toEqual([
      {
        id: sample.id,
        igsn: sample.igsn,
        name: sample.name,
        material: sample.material,
      },
    ]);
  });

  pgTest.for(["withdrawn", "tombstone"] as const)(
    "should find a stranger's %s sample within the caller's moderation reach",
    async (status, { db }) => {
      // Arrange
      await provisionUser(db, "test-token", {
        status: "accepted",
        superAdmin: true,
      });
      const stranger = await insertUser(db, "stranger@univ-lorraine.fr");
      const sample = await insertParent(
        db,
        stranger.id,
        status,
        "Gabbro des Vosges",
      );
      // Act
      const data = await search(db, { search: "Gabbro" });
      // Assert
      expect(data.map((parent) => parent.id)).toEqual([sample.id]);
    },
  );

  pgTest("should drop the excluded sample", async ({ db }) => {
    // Arrange
    const caller = await provisionUser(db, "test-token", {
      status: "accepted",
    });
    const first = await insertParent(
      db,
      caller.id,
      "published",
      "Gabbro des Vosges",
    );
    const second = await insertParent(
      db,
      caller.id,
      "published",
      "Gabbro du Morvan",
    );
    // Act
    const data = await search(db, { search: "Gabbro", exclude: first.id });
    // Assert
    expect(data.map((parent) => parent.id)).toEqual([second.id]);
  });

  pgTest("should match an exact IGSN", async ({ db }) => {
    // Arrange
    const caller = await provisionUser(db, "test-token", {
      status: "accepted",
    });
    const sample = await insertParent(
      db,
      caller.id,
      "published",
      "Gabbro des Vosges",
    );
    await insertParent(db, caller.id, "published", "Basalte du Cantal");
    // Act
    const data = await search(db, { search: sample.igsn! });
    // Assert
    expect(data.map((parent) => parent.id)).toEqual([sample.id]);
  });

  pgTest("should answer every eligible sample by name", async ({ db }) => {
    // Arrange
    const caller = await provisionUser(db, "test-token", {
      status: "accepted",
    });
    const morvan = await insertParent(
      db,
      caller.id,
      "published",
      "Gabbro du Morvan",
    );
    const vosges = await insertParent(
      db,
      caller.id,
      "published",
      "Gabbro des Vosges",
    );
    // Act
    const data = await search(db, { search: "Gabbro" });
    // Assert
    expect(data.map((parent) => parent.name)).toEqual([
      vosges.name,
      morvan.name,
    ]);
  });

  pgTest("should answer 401 without a session", async ({ db }) => {
    // Arrange
    const app = createApp(db).app;
    // Act
    const res = await app.request("/admin/samples/parents?search=Gabbro");
    // Assert
    expect(res.status).toBe(401);
  });
});
