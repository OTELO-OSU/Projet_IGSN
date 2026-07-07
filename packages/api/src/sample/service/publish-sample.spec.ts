import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";

describe("publishSample", () => {
  pgTest(
    "should publish the sample with its generated igsn",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(db, {
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: "sediment",
      });
      // Act
      const published = await publishSample(db, created.id);
      // Assert
      expect(published).toMatchObject({
        id: created.id,
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
      });

      const row = await db
        .selectFrom("sample")
        .select(["published", "igsn"])
        .where("id", "=", created.id)
        .executeTakeFirstOrThrow();
      expect(row).toEqual({
        published: true,
        igsn: generateIgsnSuffix(created.id),
      });
    },
  );

  pgTest(
    "should return null when the sample does not exist",
    async ({ db }) => {
      // Act
      const published = await publishSample(
        db,
        "01890a5d-ac96-774b-bcce-b302099a8057",
      );
      // Assert
      expect(published).toBeNull();
    },
  );

  pgTest("should keep the same igsn when published twice", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, {
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      material: "sediment",
    });
    await publishSample(db, created.id);
    // Act
    const republished = await publishSample(db, created.id);
    // Assert
    const row = await db
      .selectFrom("sample")
      .select(["published", "igsn"])
      .where("id", "=", created.id)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({
      published: true,
      igsn: generateIgsnSuffix(created.id),
    });
    expect(republished).toMatchObject({ id: created.id });
  });
});
