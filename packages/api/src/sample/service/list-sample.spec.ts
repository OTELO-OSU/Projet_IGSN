import { describe, expect } from "vitest";

import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { listSamples } from "./list-sample.ts";
import { publishSample } from "./publish-sample.ts";

// All-null age, so a fixture spreads it and overrides only the bounds it needs.
const emptyAge = {
  numericAgeMin: null,
  numericAgeMax: null,
  numericAgeUnit: null,
  numericAgeYearsUnit: null,
  geologicalAgeMin: null,
  geologicalAgeMax: null,
  geologicalUnit: null,
} as const;

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

  pgTest(
    "should filter by numeric age range across mixed units",
    async ({ db }) => {
      // Arrange: 500 ka == 0.5 Ma (in range), 5 Ma (out of range).
      await insertSample(db, {
        name: "Five hundred ka",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: {
          ...emptyAge,
          numericAgeMin: 500,
          numericAgeMax: 500,
          numericAgeUnit: "ka",
        },
      });
      await insertSample(db, {
        name: "Five Ma",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: {
          ...emptyAge,
          numericAgeMin: 5,
          numericAgeMax: 5,
          numericAgeUnit: "ma",
        },
      });
      // Act: query in Ma, so the ka sample must be converted to match.
      const { data, total } = await listSamples(db, {
        page: 1,
        perPage: 10,
        ageMin: 0.4,
        ageMax: 0.6,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(1);
      expect(data).toMatchObject([{ name: "Five hundred ka" }]);
    },
  );

  pgTest(
    "should place same-value annum ages on the before-present axis by their years unit",
    async ({ db }) => {
      // Arrange: four samples all worth 500 a, differing only by calendar
      // reference. On the before-present axis (present = 1950): 500 BCE = 2449,
      // 500 CE = 1450, 500 BP = 500, 500 cal BP = 500. Same raw value, four
      // different points in time.
      const eras = [
        ["Five hundred BCE", "bce"],
        ["Five hundred CE", "ce"],
        ["Five hundred BP", "bp"],
        ["Five hundred cal BP", "cal_bp"],
      ] as const;
      for (const [name, yearsUnit] of eras) {
        await insertSample(db, {
          name,
          nature: "rock_powder",
          type: null,
          collectionMethod: null,
          age: {
            ...emptyAge,
            numericAgeMin: 500,
            numericAgeMax: 500,
            numericAgeUnit: "a",
            numericAgeYearsUnit: yearsUnit,
          },
        });
      }
      // Act: a small before-present range around 500 must match only the two
      // whose reference already is before-present, not the CE/BCE ones.
      const nearPresent = await listSamples(db, {
        page: 1,
        perPage: 10,
        ageMin: 400,
        ageMax: 600,
        ageUnit: "a",
      });
      // Assert
      expect(nearPresent.data.map((sample) => sample.name).sort()).toEqual([
        "Five hundred BP",
        "Five hundred cal BP",
      ]);

      // The BCE offset counts from present with no year zero (500 BCE = 2449 BP).
      const bce = await listSamples(db, {
        page: 1,
        perPage: 10,
        ageMin: 2440,
        ageMax: 2460,
        ageUnit: "a",
      });
      expect(bce.data.map((sample) => sample.name)).toEqual([
        "Five hundred BCE",
      ]);
    },
  );

  pgTest(
    "should match a single-bound draft age within the range",
    async ({ db }) => {
      // Arrange: a draft with only a minimum numeric bound (100 ka).
      await insertSample(db, {
        name: "Open-ended draft",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: { ...emptyAge, numericAgeMin: 100, numericAgeUnit: "ka" },
      });
      // Act
      const { data } = await listSamples(db, {
        page: 1,
        perPage: 10,
        ageMin: 0.05,
        ageMax: 0.2,
        ageUnit: "ma",
      });
      // Assert
      expect(data).toMatchObject([{ name: "Open-ended draft" }]);
    },
  );

  pgTest(
    "should exclude samples with no age from a range filter",
    async ({ db }) => {
      // Arrange: a sample with no age recorded.
      await insertSample(db, {
        name: "Ageless",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
      });
      // Act
      const { data, total } = await listSamples(db, {
        page: 1,
        perPage: 10,
        ageMin: 0,
        ageMax: 1000,
        ageUnit: "ga",
      });
      // Assert
      expect(total).toBe(0);
      expect(data).toEqual([]);
    },
  );

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
