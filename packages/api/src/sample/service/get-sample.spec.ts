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
    "should return a persisted sample owned by its reader",
    async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const created = await insertSample(db, draft);
      await insertSampleOwner(db, created.id, owner.id);
      // Act
      const found = await getSample(db, created.id, owner.id);
      // Assert
      expect(found).toEqual({ sample: created, owned: true });
    },
  );

  pgTest(
    "should return another researcher's sample as unowned",
    async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const other = await insertUser(db, "other@univ-lorraine.fr");
      const created = await insertSample(db, draft);
      await insertSampleOwner(db, created.id, owner.id);
      // Act
      const found = await getSample(db, created.id, other.id);
      // Assert
      expect(found).toEqual({ sample: created, owned: false });
    },
  );

  // Safe default: a sample nobody owns (a row predating ownership) is nobody's.
  pgTest("should return a sample with no owner as unowned", async ({ db }) => {
    // Arrange
    const user = await insertUser(db, "user@univ-lorraine.fr");
    const created = await insertSample(db, draft);
    // Act
    const found = await getSample(db, created.id, user.id);
    // Assert
    expect(found).toEqual({ sample: created, owned: false });
  });

  // Distinct from an unowned sample, so the route keeps answering 404 on an
  // unknown id and 403 on someone else's.
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
