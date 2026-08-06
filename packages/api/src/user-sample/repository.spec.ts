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
  pgTest("should add a super admin as contributor", async ({ db }) => {
    // Arrange
    const admin = await insertUser(db, "admin@univ-lorraine.fr", {
      superAdmin: true,
    });
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    // Act
    const result = await repository.addContributor(sample.id, admin.id);
    // Assert
    expect(result).toBe("added");
    const rows = await db
      .selectFrom("user_sample")
      .selectAll()
      .where("sample_id", "=", sample.id)
      .execute();
    expect(rows).toEqual([
      { sample_id: sample.id, user_id: admin.id, role: "contributor" },
    ]);
  });

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
    expect(rows).toEqual([
      { sample_id: sample.id, user_id: owner.id, role: "owner" },
    ]);
  });

  pgTest("should reject a second owner on the same sample", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const other = await insertUser(db, "other@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);

    await expect(repository.addOwner(sample.id, other.id)).rejects.toThrow();
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

  pgTest("should add a contributor to a sample", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr", {
      name: "Durand",
    });
    const contributor = await insertUser(db, "contributor@univ-lorraine.fr", {
      name: "Curie",
    });
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);

    const result = await repository.addContributor(sample.id, contributor.id);

    expect(result).toBe("added");
    expect(await repository.listCollaborators(sample.id)).toEqual([
      {
        id: contributor.id,
        email: "contributor@univ-lorraine.fr",
        name: "Curie",
        firstname: null,
        orcid: null,
        role: "contributor",
      },
      {
        id: owner.id,
        email: "owner@univ-lorraine.fr",
        name: "Durand",
        firstname: null,
        orcid: null,
        role: "owner",
      },
    ]);
  });

  pgTest("should ignore adding the same contributor twice", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const contributor = await insertUser(db, "contributor@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);
    await repository.addContributor(sample.id, contributor.id);

    const result = await repository.addContributor(sample.id, contributor.id);

    expect(result).toBe("added");
    expect(await repository.listCollaborators(sample.id)).toHaveLength(2);
  });

  pgTest(
    "should leave the owner untouched when they are added as contributor",
    async ({ db }) => {
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const sample = await insertSample(db, draft);
      const repository = createUserSampleRepository(db);
      await repository.addOwner(sample.id, owner.id);

      const result = await repository.addContributor(sample.id, owner.id);

      expect(result).toBe("added");
      expect(await repository.listCollaborators(sample.id)).toEqual([
        {
          id: owner.id,
          email: "owner@univ-lorraine.fr",
          name: null,
          firstname: null,
          orcid: null,
          role: "owner",
        },
      ]);
      const rows = await db
        .selectFrom("user_sample")
        .selectAll()
        .where("sample_id", "=", sample.id)
        .execute();
      expect(rows).toEqual([
        { sample_id: sample.id, user_id: owner.id, role: "owner" },
      ]);
    },
  );

  pgTest("should report an unknown user as unknown_user", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);

    const result = await repository.addContributor(
      sample.id,
      "01890a5d-ac96-774b-bcce-b302099a8057",
    );

    expect(result).toBe("unknown_user");
    expect(await repository.listCollaborators(sample.id)).toEqual([
      {
        id: owner.id,
        email: "owner@univ-lorraine.fr",
        name: null,
        firstname: null,
        orcid: null,
        role: "owner",
      },
    ]);
  });

  pgTest("should list collaborators ordered by name", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr", {
      name: "Moreau",
    });
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);
    const zoe = await insertUser(db, "zoe@univ-lorraine.fr", {
      name: "Zeller",
    });
    const alice = await insertUser(db, "alice@univ-lorraine.fr", {
      name: "Aubry",
    });
    await repository.addContributor(sample.id, zoe.id);
    await repository.addContributor(sample.id, alice.id);

    const collaborators = await repository.listCollaborators(sample.id);

    expect(collaborators.map((user) => [user.name, user.role])).toEqual([
      ["Aubry", "contributor"],
      ["Moreau", "owner"],
      ["Zeller", "contributor"],
    ]);
  });

  pgTest("should not list a collaborator of another sample", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const contributor = await insertUser(db, "contributor@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    const other = await insertSample(db, { ...draft, name: "Autre" });
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);
    await repository.addOwner(other.id, owner.id);
    await repository.addContributor(other.id, contributor.id);

    expect(await repository.listCollaborators(sample.id)).toEqual([
      {
        id: owner.id,
        email: "owner@univ-lorraine.fr",
        name: null,
        firstname: null,
        orcid: null,
        role: "owner",
      },
    ]);
  });
});
