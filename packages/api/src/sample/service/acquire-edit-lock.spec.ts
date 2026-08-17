import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { type Transactional } from "../../transaction.ts";
import { acquireEditLock } from "./acquire-edit-lock.ts";
import { insertSample } from "./insert-sample.ts";

const PAST = new Date("2026-01-01T00:00:00.000Z");

async function arrange(db: Transactional<DB>) {
  const sample = await insertSample(db, {
    name: "Basalt 42",
    nature: "hand_sample",
    type: null,
  });
  const pierre = await insertUser(db, "pierre@univ-lorraine.fr", {
    name: "Pierre Martin",
  });
  const marie = await insertUser(db, "marie@univ-lorraine.fr", {
    name: "Marie Dupont",
  });
  return { sampleId: sample.id, pierre, marie };
}

describe("acquireEditLock", () => {
  pgTest("should claim a sample nobody is editing", async ({ db }) => {
    const { sampleId, pierre } = await arrange(db);

    const lock = await acquireEditLock(db, sampleId, pierre.id);

    expect(lock).toEqual({
      userId: pierre.id,
      name: "Pierre Martin",
      firstname: null,
      expiresAt: expect.any(Date),
    });
    expect(lock!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  pgTest(
    "should extend the expiry when the same user claims again",
    async ({ db }) => {
      const { sampleId, pierre } = await arrange(db);
      const first = await acquireEditLock(db, sampleId, pierre.id, 1000);

      const renewed = await acquireEditLock(db, sampleId, pierre.id);

      expect(renewed!.expiresAt.getTime()).toBeGreaterThan(
        first!.expiresAt.getTime(),
      );
    },
  );

  pgTest(
    "should refuse a lock another user holds and name its holder",
    async ({ db }) => {
      const { sampleId, pierre, marie } = await arrange(db);
      await acquireEditLock(db, sampleId, pierre.id);

      const lock = await acquireEditLock(db, sampleId, marie.id);

      expect(lock).toMatchObject({ userId: pierre.id, name: "Pierre Martin" });
    },
  );

  pgTest("should claim a lock whose expiry has passed", async ({ db }) => {
    const { sampleId, pierre, marie } = await arrange(db);
    await acquireEditLock(db, sampleId, pierre.id);
    await db
      .updateTable("sample_edit_lock")
      .set({ expires_at: PAST })
      .where("sample_id", "=", sampleId)
      .execute();

    const lock = await acquireEditLock(db, sampleId, marie.id);

    expect(lock).toMatchObject({ userId: marie.id });
  });
});
