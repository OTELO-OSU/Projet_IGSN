import { describe, expect } from "vitest";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { insertSample } from "./insert-sample.ts";
import { listSamplesAssignedTo } from "./list-sample.ts";

// The scope the admin list runs under. Sorting, filtering, facets and pagination
// are the same query for every scope and are covered in list-sample.spec.ts.
describe("listSamplesAssignedTo", () => {
  pgTest("should list only the owner's samples", async ({ db }) => {
    // Arrange
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    const other = await insertUser(db, "other@univ-lorraine.fr");
    const owned = await insertSample(db, {
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    const foreign = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: null,
      collectionMethod: null,
    });
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

  pgTest("should list nothing for an owner of nothing", async ({ db }) => {
    // Arrange
    const user = await insertUser(db, "newcomer@univ-lorraine.fr");
    await insertSample(db, {
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    // Act
    const result = await listSamplesAssignedTo(
      db,
      { page: 1, perPage: 10 },
      user.id,
    );
    // Assert
    expect(result).toEqual({ data: [], total: 0 });
  });

  // A null owner is the unscoped list, which only a super admin gets (see the
  // domain repository interface).
  pgTest("should list every sample when unscoped", async ({ db }) => {
    // Arrange
    const marie = await insertUser(db, "marie@univ-lorraine.fr");
    const other = await insertUser(db, "other@univ-lorraine.fr");
    const owned = await insertSample(db, {
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    await insertSampleOwner(db, owned.id, marie.id);
    const foreign = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: null,
      collectionMethod: null,
    });
    await insertSampleOwner(db, foreign.id, other.id);
    // Act
    const { data, total } = await listSamplesAssignedTo(
      db,
      { page: 1, perPage: 10 },
      null,
    );
    // Assert
    expect(data.map((sample) => sample.name).sort()).toEqual([
      "Basalte du Massif Central",
      "Grès de Fontainebleau",
    ]);
    expect(total).toBe(2);
  });

  pgTest("should list nothing for a sample with no owner", async ({ db }) => {
    // Arrange
    const user = await insertUser(db, "user@univ-lorraine.fr");
    await insertSample(db, {
      name: "Orphan granite",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    // Act
    const result = await listSamplesAssignedTo(
      db,
      { page: 1, perPage: 10 },
      user.id,
    );
    // Assert
    expect(result).toEqual({ data: [], total: 0 });
  });
});
