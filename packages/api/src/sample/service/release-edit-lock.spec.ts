import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { type Transactional } from "../../transaction.ts";
import { acquireEditLock } from "./acquire-edit-lock.ts";
import { getEditLock } from "./get-edit-lock.ts";
import { insertSample } from "./insert-sample.ts";
import { releaseEditLock } from "./release-edit-lock.ts";

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

describe("releaseEditLock", () => {
  pgTest("should clear a lock the caller holds", async ({ db }) => {
    const { sampleId, pierre } = await arrange(db);
    await acquireEditLock(db, sampleId, pierre.id);

    await releaseEditLock(db, sampleId, pierre.id);

    expect(await getEditLock(db, sampleId)).toBeNull();
  });

  pgTest("should leave another user's lock untouched", async ({ db }) => {
    const { sampleId, pierre, marie } = await arrange(db);
    await acquireEditLock(db, sampleId, pierre.id);

    await releaseEditLock(db, sampleId, marie.id);

    expect(await getEditLock(db, sampleId)).toMatchObject({
      userId: pierre.id,
    });
  });
});
