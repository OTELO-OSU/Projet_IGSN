import type { GeologicalAge } from "@projet-igsn/domain/sample/age/geological-age";
import type { NumericUnit } from "@projet-igsn/domain/sample/age/numeric-unit";

import { describe, expect, vi } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { listAsOwner } from "../../tests/list-as-owner.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";

const emptyAge = {
  numericAgeMin: null,
  numericAgeMax: null,
  numericAgeUnit: null,
  numericAgeYearsUnit: null,
  geologicalAgeMin: null,
  geologicalAgeMax: null,
  geologicalUnit: null,
} as const;

const numericAge = (min: number, max: number, unit: NumericUnit = "ma") => ({
  ...emptyAge,
  numericAgeMin: min,
  numericAgeMax: max,
  numericAgeUnit: unit,
});

const geologicalAge = (min: GeologicalAge, max: GeologicalAge) => ({
  ...emptyAge,
  geologicalAgeMin: min,
  geologicalAgeMax: max,
});

const backdate = (db: Transactional<DB>, id: string) =>
  db
    .updateTable("sample")
    .set({ updated_at: new Date("2026-01-01T00:00:00.000Z") })
    .where("id", "=", id)
    .execute();

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
    const { data } = await listAsOwner(db, { page: 1, perPage: 10 });
    // Assert
    expect(data).toMatchObject([
      { name: "Basalte du Massif Central", nature: "thin_section" },
      { name: "Grès de Fontainebleau", nature: "rock_powder" },
    ]);
  });

  pgTest("should sort by status through IGSN presence", async ({ db }) => {
    // Arrange
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
    await db
      .updateTable("sample")
      .set({ updated_at: new Date("2026-01-01T00:00:00.000Z") })
      .where("id", "=", draft.id)
      .execute();

    // Act / Assert
    const asc = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      sort: "status",
      order: "asc",
    });
    expect(asc.data.map((sample) => sample.name)).toEqual([
      "Draft sample",
      "Published sample",
    ]);

    const desc = await listAsOwner(db, {
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
      // Act
      const { data, total } = await listAsOwner(db, {
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
    const { data, total } = await listAsOwner(db, {
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
      const { data, total } = await listAsOwner(db, {
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
    // Act
    const { data, total } = await listAsOwner(db, {
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
      // Arrange
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
      // Act
      const { data, total } = await listAsOwner(db, {
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
    // Arrange
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
    // Act
    const { data, total } = await listAsOwner(db, {
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
      // Arrange
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
      // Act
      const nearPresent = await listAsOwner(db, {
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

      const bce = await listAsOwner(db, {
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
      // Arrange
      await insertSample(db, {
        name: "Open-ended draft",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: { ...emptyAge, numericAgeMin: 100, numericAgeUnit: "ka" },
      });
      // Act
      const { data } = await listAsOwner(db, {
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
      // Arrange
      await insertSample(db, {
        name: "Ageless",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
      });
      // Act
      const { data, total } = await listAsOwner(db, {
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

  pgTest(
    "should match a geological-only sample by overlapping range",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Miocene",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: geologicalAge(4, 4),
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        ageMin: 0,
        ageMax: 100,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(1);
      expect(data.map((s) => s.name)).toEqual(["Miocene"]);
    },
  );

  pgTest(
    "should exclude a geological-only sample outside the range",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Miocene",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: geologicalAge(4, 4),
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        ageMin: 200,
        ageMax: 300,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(0);
      expect(data).toEqual([]);
    },
  );

  pgTest(
    "should let numeric age win over an in-range geological age",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Numeric wins",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: {
          ...emptyAge,
          numericAgeMin: 100,
          numericAgeMax: 200,
          numericAgeUnit: "ma",
          geologicalAgeMin: 4,
          geologicalAgeMax: 4,
        },
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        ageMin: 0,
        ageMax: 50,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(0);
      expect(data).toEqual([]);
    },
  );

  pgTest(
    "should match on numeric age and ignore an out-of-range geological age",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Numeric in range",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: {
          ...emptyAge,
          numericAgeMin: 5,
          numericAgeMax: 15,
          numericAgeUnit: "ma",
          geologicalAgeMin: 49,
          geologicalAgeMax: 49,
        },
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        ageMin: 0,
        ageMax: 50,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(1);
      expect(data.map((s) => s.name)).toEqual(["Numeric in range"]);
    },
  );

  pgTest(
    "should match a geological range regardless of rank column order",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Reversed",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: geologicalAge(8, 4),
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        ageMin: 30,
        ageMax: 40,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(1);
      expect(data.map((s) => s.name)).toEqual(["Reversed"]);
    },
  );

  pgTest(
    "should apply an open upper bound to a geological-only sample",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Miocene",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: geologicalAge(4, 4),
      });
      await insertSample(db, {
        name: "Cretaceous",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: geologicalAge(8, 8),
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        ageMin: 70,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(1);
      expect(data.map((s) => s.name)).toEqual(["Cretaceous"]);
    },
  );

  pgTest(
    "should apply an open lower bound to a geological-only sample",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Miocene",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: geologicalAge(4, 4),
      });
      await insertSample(db, {
        name: "Cretaceous",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: geologicalAge(8, 8),
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        ageMax: 50,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(1);
      expect(data.map((s) => s.name)).toEqual(["Miocene"]);
    },
  );

  pgTest(
    "should match both stages adjacent to a query bound on their shared edge",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Below edge",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: geologicalAge(4, 4),
      });
      await insertSample(db, {
        name: "Above edge",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: geologicalAge(5, 5),
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        ageMin: 23.03,
        ageMax: 23.03,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(2);
      expect(data.map((s) => s.name).sort()).toEqual([
        "Above edge",
        "Below edge",
      ]);
    },
  );

  pgTest(
    "should match a single-bound geological range by its one rank",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Half-entered",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: { ...emptyAge, geologicalAgeMin: 8 },
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        ageMin: 0,
        ageMax: 100,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(1);
      expect(data.map((s) => s.name)).toEqual(["Half-entered"]);
    },
  );

  pgTest(
    "should match the youngest rank at the present-day edge",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Holocene",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        age: geologicalAge(1, 1),
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        ageMin: 0,
        ageMax: 0,
        ageUnit: "ma",
      });
      // Assert
      expect(total).toBe(1);
      expect(data.map((s) => s.name)).toEqual(["Holocene"]);
    },
  );

  pgTest("should match the oldest rank at its old edge", async ({ db }) => {
    // Arrange
    await insertSample(db, {
      name: "Hadean",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      age: geologicalAge(49, 49),
    });
    // Act
    const { data, total } = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      ageMin: 4567,
      ageMax: 4567,
      ageUnit: "ma",
    });
    // Assert
    expect(total).toBe(1);
    expect(data.map((s) => s.name)).toEqual(["Hadean"]);
  });

  pgTest("should match a mid-range rank at its point edges", async ({ db }) => {
    // Arrange
    await insertSample(db, {
      name: "Mid-range",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      age: geologicalAge(25, 25),
    });
    // Act + Assert
    const young = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      ageMin: 423.0,
      ageMax: 423.0,
      ageUnit: "ma",
    });
    expect(young.total).toBe(1);
    const old = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      ageMin: 427.4,
      ageMax: 427.4,
      ageUnit: "ma",
    });
    expect(old.total).toBe(1);
    const miss = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      ageMin: 427.5,
      ageMax: 427.5,
      ageUnit: "ma",
    });
    expect(miss.total).toBe(0);
  });

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
    const { data, total } = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      type: "core",
      nature: "rock_powder",
    });
    // Assert
    expect(total).toBe(1);
    expect(data.map((s) => s.name)).toEqual(["Match"]);
  });

  pgTest("should filter samples by a bounding box", async ({ db }) => {
    // Arrange
    const inside = await insertSample(db, {
      name: "Inside",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      location: { position: { type: "point", longitude: 5, latitude: 45 } },
    });
    await insertSample(db, {
      name: "Outside",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      location: { position: { type: "point", longitude: 100, latitude: 45 } },
    });
    // Act
    const { data, total } = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      bbox: { west: -10, south: 40, east: 10, north: 50 },
    });
    // Assert
    expect(total).toBe(1);
    expect(data.map((s) => s.id)).toEqual([inside.id]);
  });

  pgTest("should intersect an area straddling the box edge", async ({ db }) => {
    // Arrange
    const overlap = await insertSample(db, {
      name: "Overlap",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      location: {
        position: {
          type: "area",
          westLongitude: 8,
          eastLongitude: 12,
          southLatitude: 45,
          northLatitude: 47,
        },
      },
    });
    // Act
    const { data } = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      bbox: { west: -10, south: 40, east: 10, north: 50 },
    });
    // Assert
    expect(data.map((s) => s.id)).toEqual([overlap.id]);
  });

  pgTest(
    "should exclude a null-geom sample when a bbox is set",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "No location",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
      });
      // Act
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        bbox: { west: -10, south: 40, east: 10, north: 50 },
      });
      // Assert
      expect(total).toBe(0);
      expect(data).toEqual([]);
    },
  );

  pgTest(
    "should keep every sample inside a wide transatlantic box",
    async ({ db }) => {
      const points = [
        ["Spain", 0, 41],
        ["Southern France", 5, 43],
        ["Mid-Atlantic", -45, 45],
        ["Kansas", -90, 42],
      ] as const;
      for (const [name, longitude, latitude] of points) {
        await insertSample(db, {
          name,
          nature: "rock_powder",
          type: null,
          collectionMethod: null,
          location: { position: { type: "point", longitude, latitude } },
        });
      }
      const { data, total } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        bbox: { west: -100, south: 40, east: 10, north: 60 },
      });
      expect(total).toBe(4);
      expect(data.map((sample) => sample.name).sort()).toEqual(
        points.map(([name]) => name).sort(),
      );
    },
  );

  pgTest("should filter with a near-world-wide box", async ({ db }) => {
    for (const longitude of [0, 100, -100, 179]) {
      await insertSample(db, {
        name: `Lon ${longitude}`,
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        location: { position: { type: "point", longitude, latitude: 10 } },
      });
    }
    const { data } = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      bbox: { west: -170, south: 0, east: 170, north: 20 },
    });
    expect(data.map((sample) => sample.name).sort()).toEqual([
      "Lon -100",
      "Lon 0",
      "Lon 100",
    ]);
  });

  pgTest("should filter with a box crossing the dateline", async ({ db }) => {
    for (const longitude of [175, -175, 0, 160]) {
      await insertSample(db, {
        name: `Lon ${longitude}`,
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
        location: { position: { type: "point", longitude, latitude: 10 } },
      });
    }
    const { data } = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      bbox: { west: 170, south: 0, east: -170, north: 20 },
    });
    expect(data.map((sample) => sample.name).sort()).toEqual([
      "Lon -175",
      "Lon 175",
    ]);
  });

  pgTest("should match a stored area crossing the dateline", async ({ db }) => {
    const pacific = await insertSample(db, {
      name: "Pacific area",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      location: {
        position: {
          type: "area",
          westLongitude: 170,
          eastLongitude: -170,
          southLatitude: 0,
          northLatitude: 20,
        },
      },
    });
    const nearDateline = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      bbox: { west: 175, south: 5, east: 179, north: 15 },
    });
    const overGreenwich = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      bbox: { west: -10, south: 5, east: 10, north: 15 },
    });
    expect(nearDateline.data.map((sample) => sample.id)).toEqual([pacific.id]);
    expect(overGreenwich.data).toEqual([]);
  });

  pgTest("should compose bbox and search with AND", async ({ db }) => {
    // Arrange
    const match = await insertSample(db, {
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      location: { position: { type: "point", longitude: 5, latitude: 45 } },
    });
    await insertSample(db, {
      name: "Basalte",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
      location: { position: { type: "point", longitude: 6, latitude: 46 } },
    });
    // Act
    const { data, total } = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      search: "gres",
      bbox: { west: -10, south: 40, east: 10, north: 50 },
    });
    // Assert
    expect(total).toBe(1);
    expect(data.map((s) => s.id)).toEqual([match.id]);
  });

  pgTest("should order a search by relevance first", async ({ db }) => {
    // Arrange
    const exact = await insertSample(db, {
      name: "Basalt",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    await insertSample(db, {
      name: "Basaltic Breccia",
      nature: "rock_powder",
      type: null,
      collectionMethod: null,
    });
    await backdate(db, exact.id);
    // Act
    const { data } = await listAsOwner(db, {
      page: 1,
      perPage: 10,
      search: "basalt",
    });
    // Assert
    expect(data.map((sample) => sample.name)).toEqual([
      "Basalt",
      "Basaltic Breccia",
    ]);
  });

  pgTest(
    "should break an equal-relevance search tie by recency",
    async ({ db }) => {
      // Arrange
      await insertSample(db, {
        name: "Basalt Core",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
      });
      const older = await insertSample(db, {
        name: "Basalt Powder",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
      });
      await backdate(db, older.id);
      // Act
      const { data } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        search: "basalt",
      });
      // Assert
      expect(data.map((sample) => sample.name)).toEqual([
        "Basalt Core",
        "Basalt Powder",
      ]);
    },
  );

  pgTest("should paginate a search without gap or repeat", async ({ db }) => {
    // Arrange
    for (const name of ["Basalt One", "Basalt Two", "Basalt Three"]) {
      await insertSample(db, {
        name,
        nature: "hand_sample",
        type: null,
        collectionMethod: null,
      });
    }
    // Act
    const search = "basalt";
    const page1 = await listAsOwner(db, { page: 1, perPage: 2, search });
    const page2 = await listAsOwner(db, { page: 2, perPage: 2, search });
    // Assert
    expect(page1.total).toBe(3);
    const names = [...page1.data, ...page2.data].map((sample) => sample.name);
    expect(names.toSorted()).toEqual([
      "Basalt One",
      "Basalt Three",
      "Basalt Two",
    ]);
  });

  describe("fuzzy threshold", () => {
    const seedAchondrite = (db: Transactional<DB>) =>
      insertSample(db, {
        name: "Stony Achondrite",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
      });

    pgTest("should tolerate the plural at the default", async ({ db }) => {
      await seedAchondrite(db);

      const { data } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        search: "achondrites",
      });

      expect(data.map((sample) => sample.name)).toEqual(["Stony Achondrite"]);
    });

    pgTest("should honour a stricter override", async ({ db }) => {
      await seedAchondrite(db);
      process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD = "0.9";
      vi.resetModules();
      const { listAsOwner: listWithOverride } =
        await import("../../tests/list-as-owner.ts");

      const { data } = await listWithOverride(db, {
        page: 1,
        perPage: 10,
        search: "achondrites",
      });

      expect(data).toEqual([]);
    });

    pgTest("should not tolerate a typo in a wildcard token", async ({ db }) => {
      await seedAchondrite(db);

      const { data } = await listAsOwner(db, {
        page: 1,
        perPage: 10,
        search: "achondrites*",
      });

      expect(data).toEqual([]);
    });
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
    const page1 = await listAsOwner(db, { page: 1, perPage: 2 });
    const page2 = await listAsOwner(db, { page: 2, perPage: 2 });
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
