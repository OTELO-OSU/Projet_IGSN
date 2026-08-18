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

    const result = await repository.addCollaborator(
      sample.id,
      contributor.id,
      "contributor",
    );

    expect(result).toEqual({
      added: {
        email: "contributor@univ-lorraine.fr",
        name: "Curie",
        firstname: null,
      },
    });
    expect(await repository.listCollaborators(sample.id)).toEqual([
      {
        id: owner.id,
        email: "owner@univ-lorraine.fr",
        name: "Durand",
        firstname: null,
        orcid: null,
        role: "owner",
        status: "accepted",
      },
      {
        id: contributor.id,
        email: "contributor@univ-lorraine.fr",
        name: "Curie",
        firstname: null,
        orcid: null,
        role: "contributor",
        status: "accepted",
      },
    ]);
  });

  pgTest("should ignore adding the same contributor twice", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const contributor = await insertUser(db, "contributor@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);
    await repository.addCollaborator(sample.id, contributor.id, "contributor");

    const result = await repository.addCollaborator(
      sample.id,
      contributor.id,
      "contributor",
    );

    expect(result).toBe("already_collaborator");
    expect(await repository.listCollaborators(sample.id)).toHaveLength(2);
  });

  pgTest(
    "should refuse a role change to a caller who may not make one",
    async ({ db }) => {
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const editor = await insertUser(db, "editor@univ-lorraine.fr");
      const sample = await insertSample(db, draft);
      const repository = createUserSampleRepository(db);
      await repository.addOwner(sample.id, owner.id);
      await repository.addCollaborator(sample.id, editor.id, "editor", {
        mayChangeRole: true,
      });

      await expect(
        repository.addCollaborator(sample.id, editor.id, "contributor"),
      ).rejects.toThrow();
      const stored = await repository.listCollaborators(sample.id);
      expect(stored.find((user) => user.id === editor.id)?.role).toBe("editor");
    },
  );

  pgTest(
    "should leave the owner untouched when they are added as contributor",
    async ({ db }) => {
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const sample = await insertSample(db, draft);
      const repository = createUserSampleRepository(db);
      await repository.addOwner(sample.id, owner.id);

      const result = await repository.addCollaborator(
        sample.id,
        owner.id,
        "contributor",
      );

      expect(result).toBe("already_collaborator");
      expect(await repository.listCollaborators(sample.id)).toEqual([
        {
          id: owner.id,
          email: "owner@univ-lorraine.fr",
          name: null,
          firstname: null,
          orcid: null,
          role: "owner",
          status: "accepted",
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

  pgTest("should refuse an unknown user as collaborator", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);

    await expect(
      repository.addCollaborator(
        sample.id,
        "01890a5d-ac96-774b-bcce-b302099a8057",
        "contributor",
      ),
    ).rejects.toThrow();
    expect(await repository.listCollaborators(sample.id)).toEqual([
      {
        id: owner.id,
        email: "owner@univ-lorraine.fr",
        name: null,
        firstname: null,
        orcid: null,
        role: "owner",
        status: "accepted",
      },
    ]);
  });

  pgTest("should refuse a rejected account as collaborator", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const invitee = await insertUser(db, "invitee@univ-lorraine.fr", {
      status: "rejected",
    });
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);

    await expect(
      repository.addCollaborator(sample.id, invitee.id, "contributor"),
    ).rejects.toThrow();
    const rows = await db
      .selectFrom("user_sample")
      .selectAll()
      .where("sample_id", "=", sample.id)
      .execute();
    expect(rows).toEqual([
      { sample_id: sample.id, user_id: owner.id, role: "owner" },
    ]);
  });

  pgTest("should remove a contributor from a sample", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const contributor = await insertUser(db, "contributor@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);
    await repository.addCollaborator(sample.id, contributor.id, "contributor");

    const result = await repository.removeCollaborator(
      sample.id,
      contributor.id,
    );

    expect(result).toBe("removed");
    expect(await repository.listCollaborators(sample.id)).toEqual([
      {
        id: owner.id,
        email: "owner@univ-lorraine.fr",
        name: null,
        firstname: null,
        orcid: null,
        role: "owner",
        status: "accepted",
      },
    ]);
  });

  pgTest(
    "should leave the owner untouched when removed as contributor",
    async ({ db }) => {
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const sample = await insertSample(db, draft);
      const repository = createUserSampleRepository(db);
      await repository.addOwner(sample.id, owner.id);

      const result = await repository.removeCollaborator(sample.id, owner.id);

      expect(result).toBe("not_found");
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

  pgTest(
    "should list the owner, then the editors, then the contributors, each by name",
    async ({ db }) => {
      const owner = await insertUser(db, "owner@univ-lorraine.fr", {
        name: "Moreau",
      });
      const sample = await insertSample(db, draft);
      const repository = createUserSampleRepository(db);
      await repository.addOwner(sample.id, owner.id);
      for (const [email, name, role] of [
        ["zoe@univ-lorraine.fr", "Zeller", "contributor"],
        ["alice@univ-lorraine.fr", "Aubry", "contributor"],
        ["yann@univ-lorraine.fr", "Ybert", "editor"],
        ["bruno@univ-lorraine.fr", "Broglie", "editor"],
      ] as const) {
        const user = await insertUser(db, email, { name });
        await repository.addCollaborator(sample.id, user.id, role, {
          mayChangeRole: true,
        });
      }

      const collaborators = await repository.listCollaborators(sample.id);

      expect(collaborators.map((user) => [user.name, user.role])).toEqual([
        ["Moreau", "owner"],
        ["Broglie", "editor"],
        ["Ybert", "editor"],
        ["Aubry", "contributor"],
        ["Zeller", "contributor"],
      ]);
    },
  );

  pgTest("should not list a collaborator of another sample", async ({ db }) => {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const contributor = await insertUser(db, "contributor@univ-lorraine.fr");
    const sample = await insertSample(db, draft);
    const other = await insertSample(db, { ...draft, name: "Autre" });
    const repository = createUserSampleRepository(db);
    await repository.addOwner(sample.id, owner.id);
    await repository.addOwner(other.id, owner.id);
    await repository.addCollaborator(other.id, contributor.id, "contributor");

    expect(await repository.listCollaborators(sample.id)).toEqual([
      {
        id: owner.id,
        email: "owner@univ-lorraine.fr",
        name: null,
        firstname: null,
        orcid: null,
        role: "owner",
        status: "accepted",
      },
    ]);
  });
});
