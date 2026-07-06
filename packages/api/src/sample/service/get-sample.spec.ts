import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { getSample } from "./get-sample.ts";
import { insertSample } from "./insert-sample.ts";

describe("getSample", () => {
  pgTest("should return a persisted sample by id", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
    });
    // Act
    const found = await getSample(db, created.id);
    // Assert
    expect(found).toEqual(created);
  });

  pgTest(
    "should return null when the sample does not exist",
    async ({ db }) => {
      // Act
      const found = await getSample(db, "01890a5d-ac96-774b-bcce-b302099a8057");
      // Assert
      expect(found).toBeNull();
    },
  );
});
