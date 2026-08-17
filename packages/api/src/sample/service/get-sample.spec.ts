import { describe, expect } from "vitest";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { getSample } from "./get-sample.ts";
import { insertSample } from "./insert-sample.ts";

const draft = {
  name: "Basalte du Massif Central",
  nature: "thin_section" as const,
  type: null,
  collectionMethod: null,
};

describe("getSample", () => {
  pgTest(
    "should return a persisted sample with its reader's owner role",
    async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const created = await insertSample(db, draft);
      await insertSampleOwner(db, created.id, owner.id);
      // Act
      const found = await getSample(db, created.id, owner.id);
      // Assert
      expect(found).toEqual({ sample: created, role: "owner" });
    },
  );

  pgTest("should return its reader's contributor role", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const contributor = await insertUser(db, "contributor@univ-lorraine.fr");
    const created = await insertSample(db, draft);
    await insertSampleOwner(db, created.id, owner.id);
    await db
      .insertInto("user_sample")
      .values({
        sample_id: created.id,
        user_id: contributor.id,
        role: "contributor",
      })
      .execute();

    const found = await getSample(db, created.id, contributor.id);

    expect(found).toEqual({ sample: created, role: "contributor" });
  });

  pgTest(
    "should return another researcher's sample with no role",
    async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const other = await insertUser(db, "other@univ-lorraine.fr");
      const created = await insertSample(db, draft);
      await insertSampleOwner(db, created.id, owner.id);
      // Act
      const found = await getSample(db, created.id, other.id);
      // Assert
      expect(found).toEqual({ sample: created, role: null });
    },
  );

  pgTest("should return no role on an orphan sample", async ({ db }) => {
    // Arrange
    const user = await insertUser(db, "user@univ-lorraine.fr");
    const created = await insertSample(db, draft);
    // Act
    const found = await getSample(db, created.id, user.id);
    // Assert
    expect(found).toEqual({ sample: created, role: null });
  });

  pgTest(
    "should return null when the sample does not exist",
    async ({ db }) => {
      // Arrange
      const user = await insertUser(db, "user@univ-lorraine.fr");
      // Act
      const found = await getSample(
        db,
        "01890a5d-ac96-774b-bcce-b302099a8057",
        user.id,
      );
      // Assert
      expect(found).toBeNull();
    },
  );
});
