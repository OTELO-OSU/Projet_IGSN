import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import {
  managerScope,
  superAdminScope,
} from "@projet-igsn/domain/user/moderation-scope";
import { describe, expect } from "vitest";

import { insertSample } from "../sample/service/insert-sample.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { pgTest } from "../tests/pg-test.ts";
import { insertSampleCollaborator } from "../user-sample/insert-sample-collaborator.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { createUserRepository } from "./repository.ts";

const SUPER_ADMIN = superAdminScope("01890a5d-ac96-774b-bcce-b302099a8000");

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
  pgTest.for([
    { case: "the claims it carries", seen: claims },
    {
      case: "null for the absent name parts",
      seen: {
        email: "no.name@univ-lorraine.fr",
        name: null,
        firstname: null,
      },
    },
  ])(
    "should create the user on first sight with $case",
    async ({ seen }, { db }) => {
      // Act
      const user = await createUserRepository(db).upsert(seen);
      // Assert
      expect(user).toEqual({
        id: expect.any(String),
        ...seen,
        orcid: null,
        ...NO_GROUPS,
        status: "pending",
        superAdmin: false,
      });
    },
  );

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

  pgTest("should find a user by a lowercased orcid", async ({ db }) => {
    // Arrange
    const repository = createUserRepository(db);
    const user = await repository.upsert(claims);
    await repository.setOrcid(user.id, "0000-0001-5109-370X");
    // Act / Assert
    expect(await repository.findByOrcid("0000-0001-5109-370x")).toEqual({
      ...user,
      orcid: "0000-0001-5109-370X",
    });
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
      await insertUser(db, "marie.curie@univ-lorraine.fr", {
        name: "Curie",
        firstname: "Marie",
      });
      await insertUser(db, "pierre.dupont@univ-lorraine.fr", {
        name: "Dupont",
        firstname: "Pierre",
      });
      return createUserRepository(db);
    }

    pgTest("should find a researcher by family name", async ({ db }) => {
      const repository = await insertResearchers(db);

      const found = await repository.search(CALLER_ID, { search: "cur" });

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

      const searched = await repository.search(CALLER_ID, { search: "curie" });
      const browsed = await repository.search(CALLER_ID, {});

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
        const owner = await insertUser(db, "owner@univ-lorraine.fr", {
          name: "Moreau",
        });
        const sample = await insertSample(db, {
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: null,
          collectionMethod: null,
        });
        await insertSampleOwner(db, sample.id, owner.id);
        const curie = await repository.search(CALLER_ID, { search: "curie" });
        await insertSampleCollaborator(
          db,
          sample.id,
          curie[0]!.id,
          "contributor",
        );

        const searched = await repository.search(owner.id, {
          search: "univ",
          excludeCollaboratorsOf: sample.id,
        });
        const browsed = await repository.search(owner.id, {
          excludeCollaboratorsOf: sample.id,
        });

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

      const found = await repository.search(CALLER_ID, {
        search: "pierre.dupont@univ",
      });

      expect(found.map((user) => user.name)).toEqual(["Dupont"]);
    });

    pgTest("should ignore case", async ({ db }) => {
      const repository = await insertResearchers(db);

      const found = await repository.search(CALLER_ID, { search: "CURIE" });

      expect(found.map((user) => user.name)).toEqual(["Curie"]);
    });

    pgTest("should not match a firstname alone", async ({ db }) => {
      const repository = createUserRepository(db);
      await insertUser(db, "geologue@univ-lorraine.fr", {
        name: "Blanchard",
        firstname: "Solene",
      });

      expect(await repository.search(CALLER_ID, { search: "Solene" })).toEqual(
        [],
      );
    });

    pgTest("should order results by name", async ({ db }) => {
      const repository = createUserRepository(db);
      for (const name of ["Zeller", "Aubry", "Marchand"]) {
        await insertUser(db, `${name.toLowerCase()}@univ-lorraine.fr`, {
          name,
        });
      }

      const found = await repository.search(CALLER_ID, {
        search: "univ-lorraine",
      });

      expect(found.map((user) => user.name)).toEqual([
        "Aubry",
        "Marchand",
        "Zeller",
      ]);
    });

    pgTest("should return at most ten researchers", async ({ db }) => {
      const repository = createUserRepository(db);
      for (let index = 0; index < 12; index += 1) {
        await insertUser(db, `geologue${index}@univ-lorraine.fr`, {
          name: `Geologue${index}`,
        });
      }

      const found = await repository.search(CALLER_ID, { search: "geologue" });

      expect(found).toHaveLength(10);
    });

    pgTest("should treat wildcards as literal characters", async ({ db }) => {
      const repository = await insertResearchers(db);

      expect(await repository.search(CALLER_ID, { search: "%" })).toEqual([]);
      expect(await repository.search(CALLER_ID, { search: "_urie" })).toEqual(
        [],
      );
    });

    pgTest("should never return the caller", async ({ db }) => {
      const repository = await insertResearchers(db);
      const caller = await insertUser(db, "caller@univ-lorraine.fr", {
        name: "Caller",
      });

      const found = await repository.search(caller.id, { search: "caller" });

      expect(found).toEqual([]);
    });

    describe("without a term", () => {
      pgTest("should order every researcher by email", async ({ db }) => {
        const repository = await insertResearchers(db);

        const found = await repository.search(CALLER_ID, {});

        expect(found.map((user) => user.email)).toEqual([
          "marie.curie@univ-lorraine.fr",
          "pierre.dupont@univ-lorraine.fr",
        ]);
      });

      pgTest("should return at most twenty researchers", async ({ db }) => {
        const repository = createUserRepository(db);
        for (let index = 0; index < 21; index += 1) {
          await insertUser(
            db,
            `geologue${String(index).padStart(2, "0")}@univ-lorraine.fr`,
            { name: `Geologue${index}` },
          );
        }

        const found = await repository.search(CALLER_ID, {});

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
    const { data, total } = await createUserRepository(db).list(
      {
        page: 1,
        perPage: 25,
        status: undefined,
      },
      SUPER_ADMIN,
    );
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
      manualGroups: [],
    });
  });

  pgTest("should filter on a status, total included", async ({ db }) => {
    // Arrange
    await insertUsers(db);
    // Act
    const { data, total } = await createUserRepository(db).list(
      {
        page: 1,
        perPage: 25,
        status: "pending",
      },
      SUPER_ADMIN,
    );
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
    const { data, total } = await createUserRepository(db).list(
      {
        page: 2,
        perPage: 2,
        status: undefined,
      },
      SUPER_ADMIN,
    );
    // Assert
    expect(total).toBe(3);
    expect(data.map((user) => user.email)).toEqual([
      "rejected@univ-lorraine.fr",
    ]);
  });

  const insertGroupedUsers = (db: Parameters<typeof createUserRepository>[0]) =>
    Promise.all([
      insertUser(db, "alice@univ-lorraine.fr", {
        institutionalOrganization: "04vfs2w97",
        institutionalOsu: "OTELo",
        institutionalLaboratory: "UMR7358",
      }),
      insertUser(db, "bruno@univ-lorraine.fr", {
        status: "pending",
        institutionalOrganization: "02feahw73",
        institutionalLaboratory: "UMR7358",
      }),
      insertUser(db, "carla@univ-lorraine.fr", {
        institutionalOrganization: "02rx3b187",
        institutionalOsu: "OSUG",
        institutionalLaboratory: "UMR5275",
      }),
    ]);

  pgTest.for([
    [
      "organization",
      { institutionalOrganization: "04vfs2w97" },
      ["alice@univ-lorraine.fr"],
    ],
    ["OSU", { institutionalOsu: "OTELo" }, ["alice@univ-lorraine.fr"]],
    [
      "laboratory",
      { institutionalLaboratory: "UMR7358" },
      ["alice@univ-lorraine.fr", "bruno@univ-lorraine.fr"],
    ],
  ] as const)(
    "should return only the users of the requested %s, total included",
    async ([, filter, expected], { db }) => {
      // Arrange
      await insertGroupedUsers(db);
      // Act
      const { data, total } = await createUserRepository(db).list(
        {
          page: 1,
          perPage: 25,
          status: undefined,
          ...filter,
        },
        SUPER_ADMIN,
      );
      // Assert
      expect(data.map((user) => user.email)).toEqual(expected);
      expect(total).toBe(expected.length);
    },
  );

  pgTest("should combine a group filter with the status", async ({ db }) => {
    // Arrange
    await insertGroupedUsers(db);
    // Act
    const { data, total } = await createUserRepository(db).list(
      {
        page: 1,
        perPage: 25,
        status: "accepted",
        institutionalLaboratory: "UMR7358",
      },
      SUPER_ADMIN,
    );
    // Assert
    expect(data.map((user) => user.email)).toEqual(["alice@univ-lorraine.fr"]);
    expect(total).toBe(1);
  });

  pgTest(
    "should keep the order and the pagination when filtering",
    async ({ db }) => {
      // Arrange
      await insertGroupedUsers(db);
      // Act
      const { data, total } = await createUserRepository(db).list(
        {
          page: 2,
          perPage: 1,
          status: undefined,
          institutionalLaboratory: "UMR7358",
        },
        SUPER_ADMIN,
      );
      // Assert
      expect(data.map((user) => user.email)).toEqual([
        "bruno@univ-lorraine.fr",
      ]);
      expect(total).toBe(2);
    },
  );

  pgTest("should read one user, or null when unknown", async ({ db }) => {
    // Arrange
    await insertUsers(db);
    const repository = createUserRepository(db);
    // Act
    const found = await repository.get(
      "01890a5d-ac96-774b-bcce-b302099a8061",
      SUPER_ADMIN,
    );
    const missing = await repository.get(
      "01890a5d-ac96-774b-bcce-b302099a8099",
      SUPER_ADMIN,
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
      manualGroups: [],
      managedGroups: NO_MANAGED_GROUPS,
    });
    expect(missing).toBeNull();
  });

  pgTest(
    "should list the pending users, longest wait first",
    async ({ db }) => {
      await insertUser(db, "recent@univ-lorraine.fr", {
        name: "Recent",
        firstname: "Rose",
        status: "pending",
        createdAt: new Date("2026-08-05T09:00:00Z"),
      });
      await insertUser(db, "oldest@univ-lorraine.fr", {
        name: "Oldest",
        firstname: "Olga",
        status: "pending",
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
          institutionalLaboratory: null,
        },
        {
          email: "recent@univ-lorraine.fr",
          name: "Recent",
          firstname: "Rose",
          createdAt: new Date("2026-08-05T09:00:00Z"),
          institutionalLaboratory: null,
        },
      ]);
    },
  );

  pgTest("should list the super admins' emails", async ({ db }) => {
    await insertUser(db, "zoe@univ-lorraine.fr", { superAdmin: true });
    await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
    await insertUser(db, "researcher@univ-lorraine.fr", {});

    const emails = await createUserRepository(db).listSuperAdminEmails();

    expect(emails).toEqual(["admin@univ-lorraine.fr", "zoe@univ-lorraine.fr"]);
  });

  pgTest(
    "should list the accepted non super admin users holding a scope",
    async ({ db }) => {
      // Arrange
      const manager = await insertUser(db, "manager@univ-lorraine.fr");
      await moderateInstitution(db, manager.id, {
        kind: "laboratory",
        code: "UMR7358",
      });
      await insertUser(db, "scopeless@univ-lorraine.fr");
      const waiting = await insertUser(db, "waiting@univ-lorraine.fr", {
        status: "pending",
      });
      await moderateInstitution(db, waiting.id, {
        kind: "laboratory",
        code: "UMR7358",
      });
      const admin = await insertUser(db, "admin@univ-lorraine.fr", {
        superAdmin: true,
      });
      await moderateInstitution(db, admin.id, {
        kind: "laboratory",
        code: "UMR7358",
      });
      // Act
      const managers = await createUserRepository(db).listSpaceManagers();
      // Assert
      expect(managers).toEqual([
        {
          id: manager.id,
          email: "manager@univ-lorraine.fr",
          groups: { ...NO_MANAGED_GROUPS, laboratories: ["UMR7358"] },
        },
      ]);
    },
  );
});

describe("moderation scope", () => {
  pgTest("should reach no user at all with an empty scope", async ({ db }) => {
    // Arrange
    const caller = await insertUser(db, "manager@univ-lorraine.fr");
    const other = await insertUser(db, "peer@univ-lorraine.fr", {
      institutionalLaboratory: "UMR7358",
    });
    const repository = createUserRepository(db);
    const moderation = managerScope(caller.id, NO_MANAGED_GROUPS);
    // Act
    const listed = await repository.list({ page: 1, perPage: 25 }, moderation);
    const read = await repository.get(other.id, moderation);
    // Assert
    expect(listed).toEqual({ data: [], total: 0 });
    expect(read).toBeNull();
  });

  pgTest("should read the caller's own managed groups", async ({ db }) => {
    // Arrange
    const caller = await insertUser(db, "manager@univ-lorraine.fr");
    await moderateInstitution(
      db,
      caller.id,
      { kind: "osu", code: "OTELo" },
      { kind: "laboratory", code: "UMR5275" },
    );
    // Act
    const groups = await createUserRepository(db).getModerationScope(caller.id);
    // Assert
    expect(groups).toEqual({
      organizations: [],
      osus: ["OTELo"],
      laboratories: ["UMR5275"],
      manualGroupIds: [],
    });
  });
});
