import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { getSampleAccess } from "./get-sample-access.ts";
import { insertSampleOwner } from "./insert-sample-owner.ts";
import { insertSample } from "./insert-sample.ts";

const draft = {
  name: "Basalte du Massif Central",
  nature: "thin_section" as const,
  type: null,
  collectionMethod: null,
};

async function insertUser(
  db: Parameters<typeof getSampleAccess>[0],
  email: string,
) {
  return db
    .insertInto("user")
    .values({ id: crypto.randomUUID(), email, name: null, firstname: null })
    .returning("id")
    .executeTakeFirstOrThrow();
}

describe("getSampleAccess", () => {
  pgTest("should grant the owner access", async ({ db }) => {
    // Arrange
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    await insertSampleOwner(db, sample.id, owner.id);
    // Act
    const access = await getSampleAccess(db, sample.id, owner.id);
    // Assert
    expect(access).toBe("owner");
  });

  pgTest("should forbid a sample owned by someone else", async ({ db }) => {
    // Arrange
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const other = await insertUser(db, "other@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    await insertSampleOwner(db, sample.id, owner.id);
    // Act
    const access = await getSampleAccess(db, sample.id, other.id);
    // Assert
    expect(access).toBe("forbidden");
  });

  // Safe default: a sample nobody owns (a row predating ownership) is nobody's.
  pgTest("should forbid a sample with no owner", async ({ db }) => {
    // Arrange
    const user = await insertUser(db, "user@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    // Act
    const access = await getSampleAccess(db, sample.id, user.id);
    // Assert
    expect(access).toBe("forbidden");
  });

  // Distinct from "forbidden" so the route keeps answering 404 on an unknown id.
  pgTest("should report an unknown sample as missing", async ({ db }) => {
    // Arrange
    const user = await insertUser(db, "user@univ-lorraine.fr");
    // Act
    const access = await getSampleAccess(
      db,
      "01890a5d-ac96-774b-bcce-b302099a8057",
      user.id,
    );
    // Assert
    expect(access).toBe("missing");
  });
});
