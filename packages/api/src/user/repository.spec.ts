import { describe, expect } from "vitest";

import { pgTest } from "../tests/pg-test.ts";
import { createUserRepository } from "./repository.ts";

const claims = {
  email: "jean.martin@univ-lorraine.fr",
  name: "Martin",
  firstname: "Jean",
};

describe("createUserRepository", () => {
  pgTest("should create the user on first sight", async ({ db }) => {
    // Act
    const user = await createUserRepository(db).upsert(claims);
    // Assert
    expect(user).toEqual({ id: expect.any(String), ...claims });
  });

  pgTest("should store absent name parts as null", async ({ db }) => {
    // Act
    const user = await createUserRepository(db).upsert({
      email: "no.name@univ-lorraine.fr",
      name: null,
      firstname: null,
    });
    // Assert
    expect(user).toEqual({
      id: expect.any(String),
      email: "no.name@univ-lorraine.fr",
      name: null,
      firstname: null,
    });
  });

  pgTest(
    "should keep the same id and refresh the name on the next sight",
    async ({ db }) => {
      // Arrange
      const repository = createUserRepository(db);
      const first = await repository.upsert(claims);
      // Act
      const renamed = await repository.upsert({
        ...claims,
        name: "Martin-Durand",
      });
      // Assert
      expect(renamed).toEqual({ ...first, name: "Martin-Durand" });
    },
  );

  // A seeded owner (see scripts/seed.ts) must keep its samples once the real
  // account signs in, which only holds if the upsert adopts the row by email.
  pgTest("should adopt a seeded row with the same email", async ({ db }) => {
    // Arrange
    const seeded = { id: "01890a5d-ac96-774b-bcce-b302099a8057", ...claims };
    await db.insertInto("user").values(seeded).execute();
    // Act
    const user = await createUserRepository(db).upsert(claims);
    // Assert
    expect(user).toEqual(seeded);
  });
});
