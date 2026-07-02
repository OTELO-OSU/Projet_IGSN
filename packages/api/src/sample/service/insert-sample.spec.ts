import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { listSamples } from "./list-sample.ts";

describe("insertSample", () => {
  pgTest("should insert and read back a sample", async ({ db }) => {
    // Act
    const created = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
    });
    // Assert
    expect(created).toMatchObject({
      name: "Basalte du Massif Central",
      nature: "thin_section",
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
    });
    // Assert: the version nibble of a v7 UUID is "7".
    expect(created.id[14]).toBe("7");
  });
});
