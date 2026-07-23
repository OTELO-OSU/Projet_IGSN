import type { NumericUnit } from "@projet-igsn/domain/sample/age/numeric-unit";

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

// A numeric age range; the stratigraphic bounds stay empty. Defaults to Ma.
const numericAge = (min: number, max: number, unit: NumericUnit = "ma") => ({
  ...emptyAge,
  numericAgeMin: min,
  numericAgeMax: max,
  numericAgeUnit: unit,
});

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
    "should filter a hierarchy facet at or under the picked node",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Cored section",
        nature: "rock_powder",
        type: "core.section",
        collectionMethod: null,
      });
      await insertSample(db, {
        name: "Dredged",
        nature: "rock_powder",
        type: "dredge",
        collectionMethod: null,
      });
      // Act: picking the "core" ancestor matches its descendant section.
      const { data, total } = await listSamples(db, {
        page: 1,
        perPage: 10,
        type: "core",
      });
      // Assert
      expect(total).toBe(1);
      expect(data.map((s) => s.name)).toEqual(["Cored section"]);
    },
  );

  pgTest("should filter an enum facet by equality", async ({ db }) => {
    // Arrange
    await insertSample(db, {
      name: "Powdered",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    await insertSample(db, {
      name: "Sectioned",
      nature: "thin_section",
      type: null,
      collectionMethod: null,
    });
    // Act
    const { data, total } = await listSamples(db, {
      page: 1,
      perPage: 10,
      nature: "thin_section",
    });
    // Assert
    expect(total).toBe(1);
    expect(data.map((s) => s.name)).toEqual(["Sectioned"]);
  });

  pgTest(
    "should filter a text facet case- and accent-insensitively",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "By Curie",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        scientificContext: {
          provenanceStatus: "recent_collection",
          collectorName: "Marie Curié",
        },
      });
      await insertSample(db, {
        name: "By Darwin",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        scientificContext: {
          provenanceStatus: "recent_collection",
          collectorName: "Charles Darwin",
        },
      });
      // Act
      const { data, total } = await listSamples(db, {
        page: 1,
        perPage: 10,
        collectorName: "curie",
      });
      // Assert
      expect(total).toBe(1);
      expect(data.map((s) => s.name)).toEqual(["By Curie"]);
    },
  );

  pgTest("should filter an age range by numeric overlap", async ({ db }) => {
    // Arrange
    await insertSample(db, {
      name: "Young",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      age: numericAge(10, 20),
    });
    await insertSample(db, {
      name: "Old",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      age: numericAge(100, 200),
    });
    // Act: [15, 50] overlaps [10, 20] only.
    const { data, total } = await listSamples(db, {
      page: 1,
      perPage: 10,
      ageMin: 15,
      ageMax: 50,
      ageUnit: "ma",
    });
    // Assert
    expect(total).toBe(1);
    expect(data.map((s) => s.name)).toEqual(["Young"]);
  });

  pgTest(
    "should overlap ages across units by normalising to annum",
    async ({ db }) => {
      // Arrange: 4-5 Ga stored in Ga, a young 5-15 ka sample stored in ka.
      await insertSample(db, {
        name: "Ancient",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: numericAge(4, 5, "ga"),
      });
      await insertSample(db, {
        name: "Recent",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: numericAge(5, 15, "ka"),
      });
      // Act: query [1000, 6000] Ma == [1, 6] Ga overlaps "Ancient" only.
      const { data, total } = await listSamples(db, {
        page: 1,
        perPage: 10,
        ageMin: 1000,
        ageMax: 6000,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(1);
      expect(data.map((s) => s.name)).toEqual(["Ancient"]);
    },
  );

  pgTest("should default the query unit to Ma", async ({ db }) => {
    // Arrange: a 5-15 Ma sample and a 5-15 ka sample (a thousand times younger).
    await insertSample(db, {
      name: "Mega",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      age: numericAge(5, 15, "ma"),
    });
    await insertSample(db, {
      name: "Kilo",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      age: numericAge(5, 15, "ka"),
    });
    // Act: no unit, so [4, 6] is read as Ma and overlaps only the Ma sample.
    const { data, total } = await listSamples(db, {
      page: 1,
      perPage: 10,
      ageMin: 4,
      ageMax: 6,
    });
    // Assert
    expect(total).toBe(1);
    expect(data.map((s) => s.name)).toEqual(["Mega"]);
  });

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

  pgTest("should combine facets and the count", async ({ db }) => {
    // Arrange
    await insertSample(db, {
      name: "Match",
      nature: "rock_powder",
      type: "core.section",
      collectionMethod: null,
      specificName: "Basalt 42",
    });
    await insertSample(db, {
      name: "Wrong nature",
      nature: "thin_section",
      type: "core.section",
      collectionMethod: null,
      specificName: "Basalt 42",
    });
    // Act
    const { data, total } = await listSamples(db, {
      page: 1,
      perPage: 10,
      type: "core",
      nature: "rock_powder",
    });
    // Assert
    expect(total).toBe(1);
    expect(data.map((s) => s.name)).toEqual(["Match"]);
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
