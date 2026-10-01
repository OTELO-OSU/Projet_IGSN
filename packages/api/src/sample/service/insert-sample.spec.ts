import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { listAsOwner } from "../../tests/list-as-owner.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { publishableSample } from "../../tests/sample-fixtures.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";

const published = async (db: Kysely<DB>, input: CreateSample) =>
  (await publishSample(db, (await insertSample(db, input)).id, "published"))!;

const located = (db: Kysely<DB>) => published(db, publishableSample);

const locationless = (db: Kysely<DB>) =>
  published(db, { ...publishableSample, location: undefined });

const subSampleInput = (...parents: Sample[]): CreateSample => ({
  ...publishableSample,
  location: undefined,
  parentIds: parents.map(({ id }) => id),
});

const locationIdOf = async (db: Kysely<DB>, id: string) =>
  (
    await db
      .selectFrom("sample")
      .select("location_id")
      .where("id", "=", id)
      .executeTakeFirstOrThrow()
  ).location_id;

type Lineage = (
  db: Kysely<DB>,
) => Promise<{ parent: Sample; locatedAncestor: Sample | null }>;

const LINEAGES: { rule: string; lineage: Lineage }[] = [
  {
    rule: "its located parent's location",
    lineage: async (db) => {
      const parent = await located(db);
      return { parent, locatedAncestor: parent };
    },
  },
  {
    rule: "its located root's location through a sub-sample parent",
    lineage: async (db) => {
      const root = await located(db);
      return {
        parent: await published(db, subSampleInput(root)),
        locatedAncestor: root,
      };
    },
  },
  {
    rule: "no location from a location-less parent",
    lineage: async (db) => ({
      parent: await published(db, subSampleInput(await locationless(db))),
      locatedAncestor: null,
    }),
  },
];

describe("insertSample", () => {
  pgTest.for(LINEAGES)(
    "should give a sub-sample $rule",
    async ({ lineage }, { db }) => {
      const { parent, locatedAncestor } = await lineage(db);

      const child = await insertSample(db, subSampleInput(parent));

      expect(await locationIdOf(db, child.id)).toEqual(
        locatedAncestor && (await locationIdOf(db, locatedAncestor.id)),
      );
    },
  );

  pgTest("should round-trip a full ltree material path", async ({ db }) => {
    const created = await insertSample(db, {
      name: "Basalt 42",
      nature: "hand_sample",
      type: null,
      material: "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
    });
    expect(created).toMatchObject({
      name: "Basalt 42",
      nature: "hand_sample",
      material: "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
      texture: null,
    });
  });

  pgTest("should round-trip an igneous texture", async ({ db }) => {
    const created = await insertSample(db, {
      name: "Granite 1",
      nature: "hand_sample",
      type: null,
      material: "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic",
    });
    expect(created).toMatchObject({
      material: "rock_and_sediment.rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic",
    });
  });

  pgTest(
    "should round-trip a metamorphic facies and fabric",
    async ({ db }) => {
      const created = await insertSample(db, {
        name: "Gneiss 1",
        nature: "hand_sample",
        type: null,
        material:
          "rock_and_sediment.rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: "amphibolite",
        metamorphicFabric: "gneissic",
      });
      expect(created).toMatchObject({
        material:
          "rock_and_sediment.rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: "amphibolite",
        metamorphicFabric: "gneissic",
      });
    },
  );

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
      expect(created.geologicalContextDescription).toBeNull();
      expect(created.physiographicEnvironment).toBeNull();
    },
  );

  pgTest("should persist a null nature for a draft", async ({ db }) => {
    const created = await insertSample(db, {
      name: "Natureless draft",
      nature: null,
      type: null,
    });
    expect(created.nature).toBeNull();
  });

  pgTest("should insert and read back a sample", async ({ db }) => {
    // Act
    const created = await insertSample(db, {
      name: "Basalte du Massif Central",
      localId: "NCY-2024-017",
      localIdDescription: "Number in the quarry collection catalogue",
      nature: "thin_section",
      type: "core.section",
      collectionMethod: "coring.gravity_corer.giant",
      collectionMethodDescription: "Deployed from the aft A-frame",
      specificName: "MC-2026-007",
      geologicalContextDescription: "Volcanic pile above a\nfossil beach",
      physiographicEnvironment: "marine.fjord",
    });
    // Assert
    expect(created).toMatchObject({
      name: "Basalte du Massif Central",
      localId: "NCY-2024-017",
      localIdDescription: "Number in the quarry collection catalogue",
      nature: "thin_section",
      type: "core.section",
      collectionMethod: "coring.gravity_corer.giant",
      collectionMethodDescription: "Deployed from the aft A-frame",
      specificName: "MC-2026-007",
      geologicalContextDescription: "Volcanic pile above a\nfossil beach",
      physiographicEnvironment: "marine.fjord",
    });
    expect(created.createdAt).toBeInstanceOf(Date);

    const { data, total } = await listAsOwner(db, {
      page: 1,
      perPage: 10,
    });
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
    // Assert
    const { data } = await listAsOwner(db, { page: 1, perPage: 10 });
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
      nature: "powder",
      type: null,
      collectionMethod: null,
    });
    // Assert
    expect(created.id[14]).toBe("7");
  });

  pgTest("should insert unpublished with a null igsn", async ({ db }) => {
    // Act
    const created = await insertSample(db, {
      name: "Calcaire de Bourgogne",
      nature: "powder",
      type: null,
      collectionMethod: null,
    });
    // Assert
    const row = await db
      .selectFrom("sample")
      .select(["igsn", "status"])
      .where("id", "=", created.id)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({ igsn: null, status: "draft" });
  });

  pgTest("should reject publishing without an igsn", async ({ db }) => {
    // Arrange
    const created = await insertSample(db, {
      name: "Granite de Flamanville",
      nature: "powder",
      type: null,
      collectionMethod: null,
    });
    // Act / Assert
    await expect(
      db
        .updateTable("sample")
        .set({ status: "published" })
        .where("id", "=", created.id)
        .execute(),
    ).rejects.toThrow();
  });
});
