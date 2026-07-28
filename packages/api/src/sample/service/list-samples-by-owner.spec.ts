import { describe, expect } from "vitest";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { insertSample } from "./insert-sample.ts";
import { listSamplesByOwner } from "./list-sample.ts";

// The scope the admin list runs under. Sorting, filtering, facets and pagination
// are the same query for every scope and are covered in list-sample.spec.ts.
describe("listSamplesByOwner", () => {
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
    const { data, total } = await listSamplesByOwner(
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
    const result = await listSamplesByOwner(
      db,
      { page: 1, perPage: 10 },
      user.id,
    );
    // Assert
    expect(result).toEqual({ data: [], total: 0 });
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
    const result = await listSamplesByOwner(
      db,
      { page: 1, perPage: 10 },
      user.id,
    );
    // Assert
    expect(result).toEqual({ data: [], total: 0 });
  });
});
