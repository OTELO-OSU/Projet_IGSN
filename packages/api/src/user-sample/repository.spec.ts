import { describe, expect } from "vitest";

import { insertSample } from "../sample/service/insert-sample.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { createUserSampleRepository } from "./repository.ts";

const draft = {
  name: "Basalte du Massif Central",
  nature: "thin_section" as const,
  type: null,
  collectionMethod: null,
};

describe("userSampleRepository", () => {
  pgTest("should link a user to a sample as owner", async ({ db }) => {
    // Arrange
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    // Act
    await repository.addOwner(sample.id, owner.id);
    // Assert
    const rows = await db
      .selectFrom("user_sample")
      .selectAll()
      .where("sample_id", "=", sample.id)
      .execute();
    expect(rows).toEqual([{ sample_id: sample.id, user_id: owner.id }]);
  });

  pgTest("should reject linking the same owner twice", async ({ db }) => {
    // Arrange
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);
    // Act & Assert
    await expect(repository.addOwner(sample.id, owner.id)).rejects.toThrow();
  });

  pgTest("should reject linking to an unknown sample", async ({ db }) => {
    // Arrange
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const repository = createUserSampleRepository(db);
    // Act & Assert
    await expect(
      repository.addOwner("01890a5d-ac96-774b-bcce-b302099a8057", owner.id),
    ).rejects.toThrow();
  });
});
