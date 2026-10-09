import type { Kysely } from "kysely";

import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertOwned } from "../tests/insert-owned.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";

const retrySynchronization = (
  db: Kysely<DB>,
  headers: Record<string, string> = { Authorization: "Bearer test-token" },
) =>
  createApp(db).app.request("/admin/samples/retry-synchronization", {
    method: "POST",
    headers,
  });

const statusesOf = (db: Kysely<DB>, ids: string[]) =>
  db
    .selectFrom("sample")
    .select(["id", "synchronization_status"])
    .where("id", "in", ids)
    .orderBy("id")
    .execute();

describe("POST /admin/samples/retry-synchronization", () => {
  pgTest(
    "should requeue only the caller's failed synchronizations, drafts and published samples alike",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");
      const other = await provisionUser(db, "other");
      const failedA = await insertParent(db, caller.id, "failed", "Failed A");
      const failedB = await insertParent(db, caller.id, "published", "B");
      await db
        .updateTable("sample")
        .set({ synchronization_status: "failed" })
        .where("id", "=", failedB.id)
        .execute();
      const draft = await insertParent(db, caller.id, "draft", "Draft");
      const foreign = await insertParent(db, other.id, "failed", "Foreign");

      const res = await retrySynchronization(db);

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 200,
        body: { count: 2 },
      });
      const ids = [failedA.id, failedB.id, draft.id, foreign.id];
      expect(await statusesOf(db, ids)).toEqual(
        [
          { id: failedA.id, synchronization_status: "pending" },
          { id: failedB.id, synchronization_status: "pending" },
          { id: draft.id, synchronization_status: null },
          { id: foreign.id, synchronization_status: "failed" },
        ].sort((a, b) => a.id.localeCompare(b.id)),
      );
    },
  );

  pgTest(
    "should not requeue a sample the caller only contributes to",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");
      const owner = await provisionUser(db, "owner");
      const sample = await insertParent(db, owner.id, "failed");
      await db
        .insertInto("user_sample")
        .values({
          sample_id: sample.id,
          user_id: caller.id,
          role: "contributor",
        })
        .execute();

      const res = await retrySynchronization(db);

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 200,
        body: { count: 0 },
      });
      expect(await statusesOf(db, [sample.id])).toEqual([
        { id: sample.id, synchronization_status: "failed" },
      ]);
    },
  );

  pgTest("should refuse an anonymous retry as 401", async ({ db }) => {
    const res = await retrySynchronization(db, {});

    expect(res.status).toBe(401);
  });

  pgTest(
    "should queue the published parent of a requeued failed draft",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");
      const parent = await insertParent(db, caller.id, "published", "Parent");
      const child = await insertOwned(
        db,
        caller.id,
        { name: "Child", parentIds: [parent.id] },
        false,
      );
      await db
        .updateTable("sample")
        .set({ synchronization_status: "failed" })
        .where("id", "=", child.id)
        .execute();

      await retrySynchronization(db);

      expect(await statusesOf(db, [parent.id])).toEqual([
        { id: parent.id, synchronization_status: "pending" },
      ]);
    },
  );
});
