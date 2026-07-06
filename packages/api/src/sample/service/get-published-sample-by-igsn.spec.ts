import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { getPublishedSampleByIgsn } from "./get-published-sample-by-igsn.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";

describe("getPublishedSampleByIgsn", () => {
  pgTest("should return a published sample by its igsn", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: null,
    });
    const published = await publishSample(db, created.id);
    // Act
    const found = await getPublishedSampleByIgsn(db, published!.igsn!);
    // Assert
    expect(found).toEqual(published);
  });

  pgTest("should return null when no sample has that igsn", async ({ db }) => {
    // Act
    const found = await getPublishedSampleByIgsn(
      db,
      "0123456789ABCDEFGHJKMNPQRS",
    );
    // Assert
    expect(found).toBeNull();
  });
});
