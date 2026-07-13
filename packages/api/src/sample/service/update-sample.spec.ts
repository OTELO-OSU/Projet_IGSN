import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

describe("updateSample", () => {
  pgTest(
    "should update the name, nature, type, collection method, its description and specific name",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, {
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        collectionMethod: null,
      });
      // Act
      const updated = await updateSample(db, created.id, {
        name: "Grès de Fontainebleau",
        nature: "rock_powder",
        type: "dredge",
        collectionMethod: "dredging.chain_bag",
        collectionMethodDescription: "Chain bag dredge on the second pass",
        specificName: "FTB-2026-042",
      });
      // Assert
      expect(updated).toMatchObject({
        id: created.id,
        name: "Grès de Fontainebleau",
        nature: "rock_powder",
        type: "dredge",
        collectionMethod: "dredging.chain_bag",
        collectionMethodDescription: "Chain bag dredge on the second pass",
        specificName: "FTB-2026-042",
        createdAt: created.createdAt,
      });
    },
  );

  pgTest("should bump updatedAt", async ({ db }) => {
    // Arrange: back-date the row, since now() is frozen inside the test
    // transaction and a plain before/after comparison would always pass.
    const backdated = new Date("2020-01-01T00:00:00.000Z");
    const created = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: null,
      collectionMethod: null,
    });
    await db
      .updateTable("sample")
      .set({ updated_at: backdated })
      .where("id", "=", created.id)
      .execute();
    // Act
    const updated = await updateSample(db, created.id, {
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    // Assert
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(backdated.getTime());
  });

  pgTest(
    "should return null when the sample does not exist",
    async ({ db }) => {
      // Act
      const updated = await updateSample(
        db,
        "01890a5d-ac96-774b-bcce-b302099a8057",
        {
          name: "Grès de Fontainebleau",
          nature: "rock_powder",
          type: null,
          collectionMethod: null,
        },
      );
      // Assert
      expect(updated).toBeNull();
    },
  );
});
