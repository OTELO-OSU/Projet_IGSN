import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { type Transactional } from "../../transaction.ts";
import { insertSampleCollaborator } from "../../user-sample/insert-sample-collaborator.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { insertSample } from "./insert-sample.ts";
import { listSamplesAssignedTo } from "./list-sample.ts";

function insertSampleNamed(db: Transactional<DB>, name: string) {
  return insertSample(db, {
    name,
    nature: "rock_powder",
    type: null,
    collectionMethod: null,
  });
}

describe("listSamplesAssignedTo", () => {
  pgTest("should list only the owner's samples", async ({ db }) => {
    // Arrange
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const other = await insertUser(db, "other@univ-lorraine.fr");
    const owned = await insertSampleNamed(db, "Grès de Fontainebleau");
    const foreign = await insertSampleNamed(db, "Basalte du Massif Central");
    await insertSampleOwner(db, owned.id, owner.id);
    await insertSampleOwner(db, foreign.id, other.id);
    // Act
    const { data, total } = await listSamplesAssignedTo(
      db,
      { page: 1, perPage: 10 },
      owner.id,
    );
    // Assert
    expect(data).toMatchObject([{ name: "Grès de Fontainebleau" }]);
    expect(total).toBe(1);
  });

  pgTest.for([
    [undefined, ["Owned basalt", "Owned sandstone", "Shared gneiss"]],
    ["mine", ["Owned basalt", "Owned sandstone"]],
    ["shared", ["Shared gneiss"]],
  ] as const)(
    "should scope the assigned list to the %s ownership",
    async ([ownership, expected], { db }) => {
      // Arrange
      const marie = await insertUser(db, "marie@univ-lorraine.fr");
      const other = await insertUser(db, "other@univ-lorraine.fr");
      const sandstone = await insertSampleNamed(db, "Owned sandstone");
      const basalt = await insertSampleNamed(db, "Owned basalt");
      const gneiss = await insertSampleNamed(db, "Shared gneiss");
      await insertSampleOwner(db, sandstone.id, marie.id);
      await insertSampleOwner(db, basalt.id, marie.id);
      await insertSampleOwner(db, gneiss.id, other.id);
      await insertSampleCollaborator(db, gneiss.id, marie.id, "contributor");
      // Act
      const { data, total } = await listSamplesAssignedTo(
        db,
        { page: 1, perPage: 10, ownership },
        marie.id,
      );
      // Assert
      expect(data.map((sample) => sample.name).sort()).toEqual([...expected]);
      expect(total).toBe(expected.length);
    },
  );

  pgTest("should narrow a search instead of replacing it", async ({ db }) => {
    // Arrange
    const marie = await insertUser(db, "marie@univ-lorraine.fr");
    const other = await insertUser(db, "other@univ-lorraine.fr");
    const owned = await insertSampleNamed(db, "Granite core");
    const shared = await insertSampleNamed(db, "Granite section");
    await insertSampleOwner(db, owned.id, marie.id);
    await insertSampleOwner(db, shared.id, other.id);
    await insertSampleCollaborator(db, shared.id, marie.id, "editor");
    // Act
    const { data, total } = await listSamplesAssignedTo(
      db,
      { page: 1, perPage: 10, search: "granite", ownership: "shared" },
      marie.id,
    );
    // Assert
    expect(data.map((sample) => sample.name)).toEqual(["Granite section"]);
    expect(total).toBe(1);
  });

  pgTest(
    "should keep a sample nobody is assigned to out of both ownership scopes",
    async ({ db }) => {
      // Arrange
      const marie = await insertUser(db, "marie@univ-lorraine.fr");
      await insertSampleNamed(db, "Imported sandstone");
      const params = { page: 1, perPage: 10 };
      // Act
      const mine = await listSamplesAssignedTo(
        db,
        { ...params, ownership: "mine" },
        marie.id,
      );
      const shared = await listSamplesAssignedTo(
        db,
        { ...params, ownership: "shared" },
        marie.id,
      );
      // Assert
      expect(mine).toEqual({ data: [], total: 0 });
      expect(shared).toEqual({ data: [], total: 0 });
    },
  );
});
