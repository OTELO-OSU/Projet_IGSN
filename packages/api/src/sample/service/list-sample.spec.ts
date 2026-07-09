import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { listSamples } from "./list-sample.ts";
import { publishSample } from "./publish-sample.ts";

describe("listSamples", () => {
  pgTest("should list samples most-recently-modified first", async ({ db }) => {
    // Arrange
    const older = await insertSample(db, {
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    const newer = await insertSample(db, {
      name: "Basalte du Massif Central",
      nature: "thin_section",
      type: null,
      collectionMethod: null,
    });
    // now() is the transaction timestamp, identical for both inserts; set
    // distinct updated_at values so the ordering is deterministic.
    await db
      .updateTable("sample")
      .set({ updated_at: new Date("2026-01-01T00:00:00.000Z") })
      .where("id", "=", older.id)
      .execute();
    await db
      .updateTable("sample")
      .set({ updated_at: new Date("2026-06-01T00:00:00.000Z") })
      .where("id", "=", newer.id)
      .execute();
    // Act
    const { data } = await listSamples(db, { page: 1, perPage: 10 });
    // Assert
    expect(data).toMatchObject([
      { name: "Basalte du Massif Central", nature: "thin_section" },
      { name: "Grès de Fontainebleau", nature: "rock_powder" },
    ]);
  });

  pgTest("should sort by status through IGSN presence", async ({ db }) => {
    // Arrange: one draft (no IGSN) and one published sample.
    const draft = await insertSample(db, {
      name: "Draft sample",
      nature: "rock_powder",
      type: "individual_sample",
      material: "sediment",
      collectionMethod: null,
    });
    const published = await insertSample(db, {
      name: "Published sample",
      nature: "thin_section",
      type: "individual_sample",
      material: "sediment",
      collectionMethod: null,
    });
    await publishSample(db, published.id);
    // Backdate the draft so the updated_at tiebreak alone would put the
    // published row first: the asc assertion then proves the status sort.
    await db
      .updateTable("sample")
      .set({ updated_at: new Date("2026-01-01T00:00:00.000Z") })
      .where("id", "=", draft.id)
      .execute();

    // Act / Assert: asc puts drafts first, desc puts published first.
    const asc = await listSamples(db, {
      page: 1,
      perPage: 10,
      sort: "status",
      order: "asc",
    });
    expect(asc.data.map((sample) => sample.name)).toEqual([
      "Draft sample",
      "Published sample",
    ]);

    const desc = await listSamples(db, {
      page: 1,
      perPage: 10,
      sort: "status",
      order: "desc",
    });
    expect(desc.data.map((sample) => sample.name)).toEqual([
      "Published sample",
      "Draft sample",
    ]);
  });

  pgTest("should paginate with limit and offset", async ({ db }) => {
    // Arrange
    for (const name of ["Un", "Deux", "Trois"]) {
      await insertSample(db, {
        name,
        nature: "hand_sample",
        type: null,
        collectionMethod: null,
      });
    }
    // Act
    const page1 = await listSamples(db, { page: 1, perPage: 2 });
    const page2 = await listSamples(db, { page: 2, perPage: 2 });
    // Assert
    expect(page1.total).toBe(3);
    expect(page1.data).toHaveLength(2);
    expect(page2.data).toHaveLength(1);
    const names = [...page1.data, ...page2.data]
      .map((sample) => sample.name)
      .sort();
    expect(names).toEqual(["Deux", "Trois", "Un"]);
  });
});
