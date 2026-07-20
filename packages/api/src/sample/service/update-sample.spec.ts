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

  pgTest("should upsert then clear the age", async ({ db }) => {
    // Arrange: create without an age.
    const created = await insertSample(db, {
      name: "Basalt 42",
      nature: "hand_sample",
      type: null,
    });
    expect(created.age).toBeNull();
    // Act: add an age.
    const withAge = await updateSample(db, created.id, {
      name: "Basalt 42",
      nature: "hand_sample",
      type: null,
      age: {
        numericAgeMin: 4.2,
        numericAgeMax: 4.2,
        numericAgeUnit: "ga",
        numericAgeYearsUnit: null,
        geologicalAgeMin: null,
        geologicalAgeMax: null,
        geologicalUnit: null,
      },
    });
    // Assert
    expect(withAge?.age).toMatchObject({
      numericAgeMin: 4.2,
      numericAgeMax: 4.2,
      numericAgeUnit: "ga",
    });
    // Act: clear the age with an explicit null.
    const cleared = await updateSample(db, created.id, {
      name: "Basalt 42",
      nature: "hand_sample",
      type: null,
      age: null,
    });
    // Assert
    expect(cleared?.age).toBeNull();
    const row = await db
      .selectFrom("sample")
      .select(["numeric_age_min", "numeric_age_max", "numeric_age_unit"])
      .where("id", "=", created.id)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({
      numeric_age_min: null,
      numeric_age_max: null,
      numeric_age_unit: null,
    });
  });

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
