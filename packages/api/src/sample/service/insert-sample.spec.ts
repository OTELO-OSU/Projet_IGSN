import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { listSamples } from "./list-sample.ts";

describe("insertSample", () => {
  pgTest("should round-trip a full ltree material path", async ({ db }) => {
    const created = await insertSample(db, {
      name: "Basalt 42",
      nature: "hand_sample",
      type: null,
      material: "rock.igneous.plutonic.felsic.granite",
    });
    expect(created).toMatchObject({
      name: "Basalt 42",
      nature: "hand_sample",
      material: "rock.igneous.plutonic.felsic.granite",
      texture: null,
    });
  });

  pgTest("should round-trip an igneous texture", async ({ db }) => {
    const created = await insertSample(db, {
      name: "Granite 1",
      nature: "hand_sample",
      type: null,
      material: "rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic",
    });
    expect(created).toMatchObject({
      material: "rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic",
    });
  });

  pgTest("should round-trip a metamorphic facies", async ({ db }) => {
    const created = await insertSample(db, {
      name: "Gneiss 1",
      nature: "hand_sample",
      type: null,
      material: "rock.metamorphic.strongly_metamorphosed.gneiss",
      metamorphicFacies: "amphibolite",
    });
    expect(created).toMatchObject({
      material: "rock.metamorphic.strongly_metamorphosed.gneiss",
      metamorphicFacies: "amphibolite",
    });
  });

  pgTest(
    "should persist a null material for an unclassified draft",
    async ({ db }) => {
      const created = await insertSample(db, {
        name: "Unclassified",
        nature: "hand_sample",
        type: null,
      });
      expect(created.material).toBeNull();
      expect(created.specificName).toBeNull();
      expect(created.collectionMethodDescription).toBeNull();
    },
  );

  pgTest("should insert and read back a sample", async ({ db }) => {
    // Act
    const created = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: "core.section",
      collectionMethod: "coring.gravity_corer.giant",
      collectionMethodDescription: "Deployed from the aft A-frame",
      specificName: "MC-2026-007",
    });
    // Assert
    expect(created).toMatchObject({
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: "core.section",
      collectionMethod: "coring.gravity_corer.giant",
      collectionMethodDescription: "Deployed from the aft A-frame",
      specificName: "MC-2026-007",
    });
    expect(created.createdAt).toBeInstanceOf(Date);

    const { data, total } = await listSamples(db, { page: 1, perPage: 10 });
    expect(total).toBe(1);
    expect(data[0]).toMatchObject({ name: "Basalte du Massif Central" });
  });

  pgTest("should round-trip a full age", async ({ db }) => {
    // Act
    const created = await insertSample(db, {
      name: "Basalt 42",
      nature: "hand_sample",
      type: null,
      age: {
        numericAgeMin: 12000,
        numericAgeMax: 12000,
        numericAgeUnit: "a",
        numericAgeYearsUnit: "bp",
        geologicalAgeMin: 8,
        geologicalAgeMax: 12,
        geologicalUnit: "Green Sandstone Fm",
      },
    });
    // Assert: read back through the list path.
    const { data } = await listSamples(db, { page: 1, perPage: 10 });
    expect(data[0]?.age).toEqual({
      numericAgeMin: 12000,
      numericAgeMax: 12000,
      numericAgeUnit: "a",
      numericAgeYearsUnit: "bp",
      geologicalAgeMin: 8,
      geologicalAgeMax: 12,
      geologicalUnit: "Green Sandstone Fm",
    });
    expect(created.age?.numericAgeMin).toBe(12000);
  });

  pgTest("should persist a null age when none is given", async ({ db }) => {
    const created = await insertSample(db, {
      name: "Unclassified",
      nature: "hand_sample",
      type: null,
    });
    expect(created.age).toBeNull();
  });

  pgTest("should generate a source UUIDv7 id", async ({ db }) => {
    // Act
    const created = await insertSample(db, {
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    // Assert: the version nibble of a v7 UUID is "7".
    expect(created.id[14]).toBe("7");
  });

  pgTest("should insert unpublished with a null igsn", async ({ db }) => {
    // Act
    const created = await insertSample(db, {
      name: "Calcaire de Bourgogne",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    // Assert
    const row = await db
      .selectFrom("sample")
      .select(["igsn", "published"])
      .where("id", "=", created.id)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({ igsn: null, published: false });
  });

  pgTest("should reject publishing without an igsn", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, {
      name: "Granite de Flamanville",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    // Act / Assert
    await expect(
      db
        .updateTable("sample")
        .set({ published: true })
        .where("id", "=", created.id)
        .execute(),
    ).rejects.toThrow();
  });
});
