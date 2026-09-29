import type { Kysely } from "kysely";

import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";

const retryPublication = (
  db: Kysely<DB>,
  headers: Record<string, string> = { Authorization: "Bearer test-token" },
) =>
  createApp(db).app.request("/admin/samples/retry-publication", {
    method: "POST",
    headers,
  });

const statusesOf = (db: Kysely<DB>, ids: string[]) =>
  db
    .selectFrom("sample")
    .select(["id", "status"])
    .where("id", "in", ids)
    .orderBy("id")
    .execute();

describe("POST /admin/samples/retry-publication", () => {
  pgTest(
    "should requeue only the caller's failed publications",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");
      const other = await provisionUser(db, "other");
      const failedA = await insertParent(
        db,
        caller.id,
        "publish_failed",
        "Failed A",
      );
      const failedB = await insertParent(
        db,
        caller.id,
        "publish_failed",
        "Failed B",
      );
      const draft = await insertParent(db, caller.id, "draft", "Draft");
      const foreign = await insertParent(
        db,
        other.id,
        "publish_failed",
        "Foreign",
      );

      const res = await retryPublication(db);

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 200,
        body: { count: 2 },
      });
      const ids = [failedA.id, failedB.id, draft.id, foreign.id];
      expect(await statusesOf(db, ids)).toEqual(
        [
          { id: failedA.id, status: "publishing" },
          { id: failedB.id, status: "publishing" },
          { id: draft.id, status: "draft" },
          { id: foreign.id, status: "publish_failed" },
        ].sort((a, b) => a.id.localeCompare(b.id)),
      );
    },
  );

  pgTest(
    "should not requeue a sample the caller only contributes to",
    async ({ db }) => {
      const caller = await provisionUser(db, "test-token");
      const owner = await provisionUser(db, "owner");
      const sample = await insertParent(db, owner.id, "publish_failed");
      await db
        .insertInto("user_sample")
        .values({
          sample_id: sample.id,
          user_id: caller.id,
          role: "contributor",
        })
        .execute();

      const res = await retryPublication(db);

      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 200,
        body: { count: 0 },
      });
      expect(await statusesOf(db, [sample.id])).toEqual([
        { id: sample.id, status: "publish_failed" },
      ]);
    },
  );

  pgTest("should refuse an anonymous retry as 401", async ({ db }) => {
    const res = await retryPublication(db, {});

    expect(res.status).toBe(401);
  });
});
