import { describe, expect } from "vitest";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { getPublicSampleByIgsn } from "./get-public-sample-by-igsn.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";

describe("getPublicSampleByIgsn", () => {
  pgTest("should return a published sample by its igsn", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: null,
      material: "sediment",
      collectionMethod: null,
    });
    const published = await publishSample(db, created.id);
    // Act
    const found = await getPublicSampleByIgsn(db, published!.igsn!);
    // Assert
    expect(found).toEqual(published);
  });

  pgTest("should carry the owner's name, never their email", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: null,
      material: "sediment",
      collectionMethod: null,
    });
    const owner = await insertUser(db, "marie.dupont@univ-lorraine.fr", {
      name: "Dupont",
      firstname: "Marie",
    });
    await insertSampleOwner(db, created.id, owner.id);
    const published = await publishSample(db, created.id);
    // Act
    const found = await getPublicSampleByIgsn(db, published!.igsn!);
    // Assert
    expect(found!.owner).toEqual({ name: "Dupont", firstname: "Marie" });
  });

  pgTest("should return null when no sample has that igsn", async ({ db }) => {
    // Act
    const found = await getPublicSampleByIgsn(db, "0123456789ABCDEFGHJKMNPQRS");
    // Assert
    expect(found).toBeNull();
  });
});
