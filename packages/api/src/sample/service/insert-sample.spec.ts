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
      material: "rock.igneous",
    });
    expect(created).toMatchObject({
      name: "Basalt 42",
      nature: "hand_sample",
      material: "rock.igneous",
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
    },
  );

  pgTest("should insert and read back a sample", async ({ db }) => {
    // Act
    const created = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: "core.section",
    });
    // Assert
    expect(created).toMatchObject({
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: "core.section",
    });
    expect(created.createdAt).toBeInstanceOf(Date);

    const { data, total } = await listSamples(db, { page: 1, perPage: 10 });
    expect(total).toBe(1);
    expect(data[0]).toMatchObject({ name: "Basalte du Massif Central" });
  });

  pgTest("should generate a source UUIDv7 id", async ({ db }) => {
    // Act
    const created = await insertSample(db, {
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
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
