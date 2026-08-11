import { describe, expect } from "vitest";

import { insertSample } from "../sample/service/insert-sample.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { insertSampleCollaborator } from "../user-sample/insert-sample-collaborator.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { createUserRepository } from "./repository.ts";

const NO_GROUPS = {
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
};

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
    expect(user).toEqual({
      id: expect.any(String),
      ...claims,
      orcid: null,
      ...NO_GROUPS,
      status: "pending",
      superAdmin: false,
    });
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
      ...NO_GROUPS,
      status: "pending",
      superAdmin: false,
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
      const holder = await insertUser(db, "holder@univ-lorraine.fr", {
        orcid: "0000-0002-1825-0097",
      });
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

  pgTest("should leave a moderated row's status untouched", async ({ db }) => {
    // Arrange
    await db
      .insertInto("user")
      .values({
        id: "01890a5d-ac96-774b-bcce-b302099a8058",
        ...claims,
        status: "accepted",
        super_admin: true,
      })
      .execute();
    // Act
    const user = await createUserRepository(db).upsert(claims);
    // Assert
    expect(user).toEqual({
      id: "01890a5d-ac96-774b-bcce-b302099a8058",
      ...claims,
      orcid: null,
      ...NO_GROUPS,
      status: "accepted",
      superAdmin: true,
    });
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

    pgTest("should list a super admin", async ({ db }) => {
      const repository = await insertResearchers(db);
      await insertUser(db, "admin.curie@univ-lorraine.fr", {
        name: "Admin",
        superAdmin: true,
      });

      const searched = await repository.search("curie", CALLER_ID);
      const browsed = await repository.search(undefined, CALLER_ID);

      expect(searched.map((user) => user.email)).toEqual([
        "admin.curie@univ-lorraine.fr",
        "marie.curie@univ-lorraine.fr",
      ]);
      expect(browsed.map((user) => user.email)).toEqual([
        "admin.curie@univ-lorraine.fr",
        "marie.curie@univ-lorraine.fr",
        "pierre.dupont@univ-lorraine.fr",
      ]);
    });

    pgTest(
      "should leave out the collaborators of the given sample",
      async ({ db }) => {
        const repository = await insertResearchers(db);
        const owner = await repository.upsert({
          email: "owner@univ-lorraine.fr",
          name: "Moreau",
          firstname: null,
        });
        const sample = await insertSample(db, {
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: null,
          collectionMethod: null,
        });
        await insertSampleOwner(db, sample.id, owner.id);
        const curie = await repository.search("curie", CALLER_ID);
        await insertSampleCollaborator(
          db,
          sample.id,
          curie[0]!.id,
          "contributor",
        );

        const searched = await repository.search("univ", owner.id, sample.id);
        const browsed = await repository.search(undefined, owner.id, sample.id);

        expect(searched.map((user) => user.email)).toEqual([
          "pierre.dupont@univ-lorraine.fr",
        ]);
        expect(browsed.map((user) => user.email)).toEqual([
          "pierre.dupont@univ-lorraine.fr",
        ]);
      },
    );

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
    });
  });

  const insertUsers = (db: Parameters<typeof createUserRepository>[0]) =>
    db
      .insertInto("user")
      .values([
        {
          id: "01890a5d-ac96-774b-bcce-b302099a8061",
          email: "pending@univ-lorraine.fr",
          name: "Pending",
          firstname: "Paul",
        },
        {
          id: "01890a5d-ac96-774b-bcce-b302099a8062",
          email: "accepted@univ-lorraine.fr",
          name: "Accepted",
          firstname: "Anne",
          status: "accepted",
        },
        {
          id: "01890a5d-ac96-774b-bcce-b302099a8063",
          email: "rejected@univ-lorraine.fr",
          name: "Rejected",
          firstname: "Remi",
          status: "rejected",
        },
      ])
      .execute();

  pgTest("should list every user with a total", async ({ db }) => {
    // Arrange
    await insertUsers(db);
    // Act
    const { data, total } = await createUserRepository(db).list({
      page: 1,
      perPage: 25,
      status: undefined,
    });
    // Assert
    expect(total).toBe(3);
    expect(data.map((user) => user.email)).toEqual([
      "accepted@univ-lorraine.fr",
      "pending@univ-lorraine.fr",
      "rejected@univ-lorraine.fr",
    ]);
    expect(data[0]).toEqual({
      id: "01890a5d-ac96-774b-bcce-b302099a8062",
      email: "accepted@univ-lorraine.fr",
      name: "Accepted",
      firstname: "Anne",
      orcid: null,
      ...NO_GROUPS,
      status: "accepted",
      superAdmin: false,
    });
  });

  pgTest("should filter on a status, total included", async ({ db }) => {
    // Arrange
    await insertUsers(db);
    // Act
    const { data, total } = await createUserRepository(db).list({
      page: 1,
      perPage: 25,
      status: "pending",
    });
    // Assert
    expect(total).toBe(1);
    expect(data.map((user) => user.email)).toEqual([
      "pending@univ-lorraine.fr",
    ]);
  });

  pgTest("should paginate", async ({ db }) => {
    // Arrange
    await insertUsers(db);
    // Act
    const { data, total } = await createUserRepository(db).list({
      page: 2,
      perPage: 2,
      status: undefined,
    });
    // Assert
    expect(total).toBe(3);
    expect(data.map((user) => user.email)).toEqual([
      "rejected@univ-lorraine.fr",
    ]);
  });

  pgTest("should read one user, or null when unknown", async ({ db }) => {
    // Arrange
    await insertUsers(db);
    const repository = createUserRepository(db);
    // Act
    const found = await repository.get("01890a5d-ac96-774b-bcce-b302099a8061");
    const missing = await repository.get(
      "01890a5d-ac96-774b-bcce-b302099a8099",
    );
    // Assert
    expect(found).toEqual({
      id: "01890a5d-ac96-774b-bcce-b302099a8061",
      email: "pending@univ-lorraine.fr",
      name: "Pending",
      firstname: "Paul",
      orcid: null,
      ...NO_GROUPS,
      status: "pending",
      superAdmin: false,
    });
    expect(missing).toBeNull();
  });

  pgTest("should set a status and return the new row", async ({ db }) => {
    // Arrange
    await insertUsers(db);
    const repository = createUserRepository(db);
    // Act
    const accepted = await repository.setStatus(
      "01890a5d-ac96-774b-bcce-b302099a8061",
      "accepted",
    );
    const rejected = await repository.setStatus(
      "01890a5d-ac96-774b-bcce-b302099a8062",
      "rejected",
    );
    // Assert
    expect(accepted).toEqual({
      id: "01890a5d-ac96-774b-bcce-b302099a8061",
      email: "pending@univ-lorraine.fr",
      name: "Pending",
      firstname: "Paul",
      orcid: null,
      ...NO_GROUPS,
      status: "accepted",
      superAdmin: false,
    });
    expect(rejected).toEqual({
      id: "01890a5d-ac96-774b-bcce-b302099a8062",
      email: "accepted@univ-lorraine.fr",
      name: "Accepted",
      firstname: "Anne",
      orcid: null,
      ...NO_GROUPS,
      status: "rejected",
      superAdmin: false,
    });
    await expect(
      repository.get("01890a5d-ac96-774b-bcce-b302099a8061"),
    ).resolves.toEqual(accepted);
  });

  pgTest("should refuse an unknown status at the database", async ({ db }) => {
    await expect(
      db
        .insertInto("user")
        .values({
          id: "01890a5d-ac96-774b-bcce-b302099a8064",
          email: "broken@univ-lorraine.fr",
          name: null,
          firstname: null,
          status: "banned",
        })
        .execute(),
    ).rejects.toThrow(/user_status_check/);
  });

  pgTest("should answer null when setting an unknown user", async ({ db }) => {
    // Act
    const updated = await createUserRepository(db).setStatus(
      "01890a5d-ac96-774b-bcce-b302099a8099",
      "accepted",
    );
    // Assert
    expect(updated).toBeNull();
  });

  pgTest(
    "should list the pending users, longest wait first",
    async ({ db }) => {
      await insertUser(db, "recent@univ-lorraine.fr", {
        name: "Recent",
        firstname: "Rose",
        createdAt: new Date("2026-08-05T09:00:00Z"),
      });
      await insertUser(db, "oldest@univ-lorraine.fr", {
        name: "Oldest",
        firstname: "Olga",
        createdAt: new Date("2026-07-07T12:00:00Z"),
      });
      await insertUser(db, "accepted@univ-lorraine.fr", {
        status: "accepted",
        createdAt: new Date("2026-06-01T12:00:00Z"),
      });
      await insertUser(db, "rejected@univ-lorraine.fr", {
        status: "rejected",
        createdAt: new Date("2026-06-01T12:00:00Z"),
      });

      const pending = await createUserRepository(db).listPending();

      expect(pending).toEqual([
        {
          email: "oldest@univ-lorraine.fr",
          name: "Oldest",
          firstname: "Olga",
          createdAt: new Date("2026-07-07T12:00:00Z"),
        },
        {
          email: "recent@univ-lorraine.fr",
          name: "Recent",
          firstname: "Rose",
          createdAt: new Date("2026-08-05T09:00:00Z"),
        },
      ]);
    },
  );

  pgTest("should list the super admins' emails", async ({ db }) => {
    await insertUser(db, "zoe@univ-lorraine.fr", {
      status: "accepted",
      superAdmin: true,
    });
    await insertUser(db, "admin@univ-lorraine.fr", {
      status: "accepted",
      superAdmin: true,
    });
    await insertUser(db, "researcher@univ-lorraine.fr", { status: "accepted" });

    const emails = await createUserRepository(db).listSuperAdminEmails();

    expect(emails).toEqual(["admin@univ-lorraine.fr", "zoe@univ-lorraine.fr"]);
  });
});
