import { describe, expect } from "vitest";

import { insertUser } from "../tests/insert-user.ts";
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
    expect(user).toEqual({ id: expect.any(String), ...claims, orcid: null });
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
      orcid: null,
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
    expect(user).toEqual({ ...seeded, orcid: null });
  });

  pgTest("should keep the stored orcid on the next sight", async ({ db }) => {
    // Arrange
    const repository = createUserRepository(db);
    const first = await repository.upsert(claims);
    await repository.setOrcid(first.id, "0000-0002-1825-0097");
    // Act
    const again = await repository.upsert(claims);
    // Assert
    expect(again).toEqual({ ...first, orcid: "0000-0002-1825-0097" });
  });

  pgTest("should set and return the user's orcid", async ({ db }) => {
    // Arrange
    const repository = createUserRepository(db);
    const user = await repository.upsert(claims);
    // Act
    const updated = await repository.setOrcid(user.id, "0000-0002-1825-0097");
    // Assert
    expect(updated).toEqual({ ...user, orcid: "0000-0002-1825-0097" });
  });

  pgTest("should clear the orcid with null", async ({ db }) => {
    // Arrange
    const repository = createUserRepository(db);
    const user = await repository.upsert(claims);
    await repository.setOrcid(user.id, "0000-0002-1825-0097");
    // Act
    const cleared = await repository.setOrcid(user.id, null);
    // Assert
    expect(cleared).toEqual({ ...user, orcid: null });
  });

  pgTest(
    "should refuse an orcid already held by another user",
    async ({ db }) => {
      // Arrange
      const repository = createUserRepository(db);
      const holder = await insertUser(
        db,
        "holder@univ-lorraine.fr",
        "0000-0002-1825-0097",
      );
      const user = await repository.upsert(claims);
      // Act
      const refused = await repository.setOrcid(user.id, "0000-0002-1825-0097");
      // Assert
      expect(refused).toBeNull();
      expect(await repository.findByOrcid("0000-0002-1825-0097")).toEqual(
        expect.objectContaining({ id: holder.id }),
      );
    },
  );

  pgTest("should find a user by orcid", async ({ db }) => {
    // Arrange
    const repository = createUserRepository(db);
    const user = await repository.upsert(claims);
    await repository.setOrcid(user.id, "0000-0002-1825-0097");
    // Act / Assert
    expect(await repository.findByOrcid("0000-0002-1825-0097")).toEqual({
      ...user,
      orcid: "0000-0002-1825-0097",
    });
    expect(await repository.findByOrcid("0000-0001-5109-3700")).toBeUndefined();
  });

  describe("search", () => {
    const CALLER_ID = "01890a5d-ac96-774b-bcce-b302099a80ff";

    async function insertResearchers(
      db: Parameters<typeof createUserRepository>[0],
    ) {
      const repository = createUserRepository(db);
      await repository.upsert({
        email: "marie.curie@univ-lorraine.fr",
        name: "Curie",
        firstname: "Marie",
      });
      await repository.upsert({
        email: "pierre.dupont@univ-lorraine.fr",
        name: "Dupont",
        firstname: "Pierre",
      });
      return repository;
    }

    pgTest("should find a researcher by family name", async ({ db }) => {
      const repository = await insertResearchers(db);

      const found = await repository.search("cur", CALLER_ID);

      expect(found).toEqual([
        {
          id: expect.any(String),
          email: "marie.curie@univ-lorraine.fr",
          name: "Curie",
          firstname: "Marie",
          orcid: null,
        },
      ]);
    });

    pgTest("should find a researcher by email", async ({ db }) => {
      const repository = await insertResearchers(db);

      const found = await repository.search("pierre.dupont@univ", CALLER_ID);

      expect(found.map((user) => user.name)).toEqual(["Dupont"]);
    });

    pgTest("should ignore case", async ({ db }) => {
      const repository = await insertResearchers(db);

      const found = await repository.search("CURIE", CALLER_ID);

      expect(found.map((user) => user.name)).toEqual(["Curie"]);
    });

    pgTest("should not match a firstname alone", async ({ db }) => {
      const repository = createUserRepository(db);
      await repository.upsert({
        email: "geologue@univ-lorraine.fr",
        name: "Blanchard",
        firstname: "Solene",
      });

      expect(await repository.search("Solene", CALLER_ID)).toEqual([]);
    });

    pgTest(
      "should return an empty list when nothing matches",
      async ({ db }) => {
        const repository = await insertResearchers(db);

        expect(await repository.search("zzz", CALLER_ID)).toEqual([]);
      },
    );

    pgTest("should order results by name", async ({ db }) => {
      const repository = createUserRepository(db);
      for (const name of ["Zeller", "Aubry", "Marchand"]) {
        await repository.upsert({
          email: `${name.toLowerCase()}@univ-lorraine.fr`,
          name,
          firstname: null,
        });
      }

      const found = await repository.search("univ-lorraine", CALLER_ID);

      expect(found.map((user) => user.name)).toEqual([
        "Aubry",
        "Marchand",
        "Zeller",
      ]);
    });

    pgTest("should return at most ten researchers", async ({ db }) => {
      const repository = createUserRepository(db);
      for (let index = 0; index < 12; index += 1) {
        await repository.upsert({
          email: `geologue${index}@univ-lorraine.fr`,
          name: `Geologue${index}`,
          firstname: null,
        });
      }

      const found = await repository.search("geologue", CALLER_ID);

      expect(found).toHaveLength(10);
    });

    pgTest("should treat wildcards as literal characters", async ({ db }) => {
      const repository = await insertResearchers(db);

      expect(await repository.search("%", CALLER_ID)).toEqual([]);
      expect(await repository.search("_urie", CALLER_ID)).toEqual([]);
    });

    pgTest("should never return the caller", async ({ db }) => {
      const repository = await insertResearchers(db);
      const caller = await repository.upsert({
        email: "caller@univ-lorraine.fr",
        name: "Caller",
        firstname: null,
      });

      const found = await repository.search("caller", caller.id);

      expect(found).toEqual([]);
    });

    describe("without a term", () => {
      pgTest("should order every researcher by email", async ({ db }) => {
        const repository = await insertResearchers(db);

        const found = await repository.search(undefined, CALLER_ID);

        expect(found.map((user) => user.email)).toEqual([
          "marie.curie@univ-lorraine.fr",
          "pierre.dupont@univ-lorraine.fr",
        ]);
      });

      pgTest("should return at most twenty researchers", async ({ db }) => {
        const repository = createUserRepository(db);
        for (let index = 0; index < 21; index += 1) {
          await repository.upsert({
            email: `geologue${String(index).padStart(2, "0")}@univ-lorraine.fr`,
            name: `Geologue${index}`,
            firstname: null,
          });
        }

        const found = await repository.search(undefined, CALLER_ID);

        expect(found).toHaveLength(20);
        expect(found.at(-1)?.email).toBe("geologue19@univ-lorraine.fr");
      });

      pgTest("should exclude the caller", async ({ db }) => {
        const repository = await insertResearchers(db);
        const caller = await repository.upsert({
          email: "aaa.caller@univ-lorraine.fr",
          name: "Caller",
          firstname: null,
        });

        const found = await repository.search(undefined, caller.id);

        expect(found.map((user) => user.email)).not.toContain(
          "aaa.caller@univ-lorraine.fr",
        );
      });
    });
  });
});
