import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import { NATURES } from "@projet-igsn/domain/sample/nature";
import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { draft } from "../../tests/sample-fixtures.ts";
import { deleteSampleCollaborator } from "../../user-sample/delete-sample-collaborator.ts";
import { insertSampleCollaborator } from "../../user-sample/insert-sample-collaborator.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { countPublishedFacets } from "./count-facets.ts";
import { insertSample } from "./insert-sample.ts";
import { listPublishedSamples } from "./list-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { replaceSampleManualGroups } from "./replace-sample-manual-groups.ts";
import { replaceSampleMineralClassifications } from "./replace-sample-mineral-classifications.ts";
import { setSampleStatus } from "./set-sample-status.ts";
import { writeSampleLocation } from "./write-sample-location.ts";

const page = { page: 1, perPage: 10 };

const ROCK = "rock_and_sediment.rock";

const AUVERGNE = { west: 0, south: 40, east: 10, north: 50 };

const GROUP = "0b6a2f4e-6c1d-4a8e-9f3b-2d7c5e1a9b40";

async function insertPublished(
  db: Transactional<DB>,
  overrides: Partial<CreateSample> = {},
) {
  const sample = await insertSample(db, { ...draft, ...overrides });
  await publishSample(db, sample.id);
  return sample;
}

async function insertRockAndSediment(db: Transactional<DB>) {
  await insertPublished(db, {
    material: "rock_and_sediment.rock",
    nature: "powder",
  });
  await insertPublished(db, {
    material: "rock_and_sediment.sediment",
    nature: "thin_section",
  });
}

async function insertGroup(db: Transactional<DB>) {
  const id = crypto.randomUUID();
  await db.insertInto("manual_group").values({ id, name: id }).execute();
  return id;
}

const insertMember = async (db: Transactional<DB>) =>
  (await insertUser(db, `${crypto.randomUUID()}@univ-lorraine.fr`)).id;

const point = (longitude: number, latitude: number) => ({
  position: { type: "point" as const, longitude, latitude },
});

const mineral = (strunzId: string, mindatId: number | null = null) => ({
  strunzId,
  mindatId,
  abundance: null,
});

const fieldSample = (
  chiefScientistLastname: string,
  researchProgramName: string,
) => ({
  provenanceStatus: "field_sample" as const,
  additionalRoles: [],
  chiefScientistFirstname: "Marie",
  chiefScientistLastname,
  researchProgramName,
});

const numericAge = (numericAgeMin: number, numericAgeMax: number) => ({
  numericAgeMin,
  numericAgeMax,
  numericAgeUnit: "ma" as const,
  numericAgeYearsUnit: null,
  geologicalAgeMin: null,
  geologicalAgeMax: null,
  geologicalUnit: null,
});

type LinkWrite = (db: Transactional<DB>) => Promise<{
  params?: Partial<ListSamplesQuery>;
  key: "manualGroup" | "mineralClassification" | "contributor" | "nature";
  expected: Record<string, number>;
}>;

const LINK_WRITES: [string, LinkWrite][] = [
  [
    "replacing its manual groups",
    async (db) => {
      const [before, after] = [await insertGroup(db), await insertGroup(db)];
      const sample = await insertPublished(db, { manualGroupIds: [before] });
      await replaceSampleManualGroups(db, sample.id, [after]);
      return { key: "manualGroup", expected: { [after]: 1 } };
    },
  ],
  [
    "deleting its manual group",
    async (db) => {
      const group = await insertGroup(db);
      await insertPublished(db, { manualGroupIds: [group] });
      await db.deleteFrom("manual_group").where("id", "=", group).execute();
      return { key: "manualGroup", expected: {} };
    },
  ],
  [
    "replacing its minerals",
    async (db) => {
      const sample = await insertPublished(db, {
        material: "rock_and_sediment.mineral",
        mineralClassifications: [mineral("9.E")],
      });
      await replaceSampleMineralClassifications(db, sample.id, [
        mineral("2.B-E"),
      ]);
      return {
        key: "mineralClassification",
        expected: { "2": 1, "2.B-E": 1 },
      };
    },
  ],
  [
    "adding a collaborator",
    async (db) => {
      const [owner, editor] = [await insertMember(db), await insertMember(db)];
      const sample = await insertPublished(db);
      await insertSampleOwner(db, sample.id, owner);
      await insertSampleCollaborator(db, sample.id, editor, "editor");
      return { key: "contributor", expected: { [owner]: 1, [editor]: 1 } };
    },
  ],
  [
    "removing a collaborator",
    async (db) => {
      const [owner, editor] = [await insertMember(db), await insertMember(db)];
      const sample = await insertPublished(db);
      await insertSampleOwner(db, sample.id, owner);
      await insertSampleCollaborator(db, sample.id, editor, "editor");
      await deleteSampleCollaborator(db, sample.id, editor);
      return { key: "contributor", expected: { [owner]: 1 } };
    },
  ],
  [
    "editing its shared location in place",
    async (db) => {
      const parent = await insertPublished(db, {
        material: "rock_and_sediment.rock",
        nature: "powder",
        location: point(5, 45),
      });
      await insertPublished(db, {
        material: "rock_and_sediment.rock",
        nature: "thin_section",
        parentIds: [parent.id],
      });
      await writeSampleLocation(db, parent.id, point(-50, 0));
      return {
        params: {
          includeSubSamples: true,
          bbox: { west: -60, south: -10, east: -40, north: 10 },
        },
        key: "nature",
        expected: { powder: 1, thin_section: 1 },
      };
    },
  ],
];

describe("countPublishedFacets", () => {
  pgTest(
    "should answer an empty count per facet without samples",
    async ({ db }) => {
      // Act
      const counts = await countPublishedFacets(db, page);
      // Assert
      expect(counts).toEqual({
        type: {},
        material: {},
        mineralClassification: {},
        collectionMethod: {},
        nature: {},
        hostInstitution: {},
        institutionalOrganization: {},
        institutionalOsu: {},
        institutionalLaboratory: {},
        manualGroup: {},
        contributor: {},
      });
    },
  );

  pgTest("should count the samples per enum value", async ({ db }) => {
    // Arrange
    await insertPublished(db, { nature: "powder" });
    await insertPublished(db, { nature: "powder" });
    await insertPublished(db, { nature: "thin_section" });
    // Act
    const { nature } = await countPublishedFacets(db, page);
    // Assert
    expect(nature).toEqual({ powder: 2, thin_section: 1 });
  });

  pgTest(
    "should count a multi-valued sample once under each of its values",
    async ({ db }) => {
      // Arrange
      const scientificContext = (hostInstitution: string[]) => ({
        provenanceStatus: "field_sample" as const,
        additionalRoles: [],
        hostInstitution,
      });
      await insertPublished(db, {
        scientificContext: scientificContext(["04kdfz702", "02feahw73"]),
      });
      await insertPublished(db, {
        scientificContext: scientificContext(["04kdfz702"]),
      });
      // Act
      const { hostInstitution } = await countPublishedFacets(db, page);
      // Assert
      expect(hostInstitution).toEqual({ "04kdfz702": 2, "02feahw73": 1 });
    },
  );

  pgTest(
    "should count under a hierarchy node every sample at or below it",
    async ({ db }) => {
      // Arrange
      await insertRockAndSediment(db);
      await insertPublished(db, {
        material: "rock_and_sediment.sediment.exogenous_detritic.clay",
      });
      // Act
      const { material } = await countPublishedFacets(db, page);
      // Assert
      expect(material).toEqual({
        rock_and_sediment: 3,
        "rock_and_sediment.rock": 1,
        "rock_and_sediment.sediment": 2,
        "rock_and_sediment.sediment.exogenous_detritic": 1,
        "rock_and_sediment.sediment.exogenous_detritic.clay": 1,
      });
    },
  );

  pgTest("should count a linked facet through its join", async ({ db }) => {
    // Arrange
    const groupId = crypto.randomUUID();
    await db
      .insertInto("manual_group")
      .values({ id: groupId, name: "ANR CritMet 22f" })
      .execute();
    const owner = await insertUser(
      db,
      `${crypto.randomUUID()}@univ-lorraine.fr`,
    );
    const grouped = await insertPublished(db, { manualGroupIds: [groupId] });
    const other = await insertPublished(db);
    await insertSampleOwner(db, grouped.id, owner.id);
    await insertSampleOwner(db, other.id, owner.id);
    // Act
    const { manualGroup, contributor } = await countPublishedFacets(db, page);
    // Assert
    expect({ manualGroup, contributor }).toEqual({
      manualGroup: { [groupId]: 1 },
      contributor: { [owner.id]: 2 },
    });
  });

  pgTest("should ignore a facet's own filter in its counts", async ({ db }) => {
    // Arrange
    await insertRockAndSediment(db);
    // Act
    const { material } = await countPublishedFacets(db, {
      ...page,
      material: "rock_and_sediment.rock",
    });
    // Assert
    expect(material).toEqual({
      rock_and_sediment: 2,
      "rock_and_sediment.rock": 1,
      "rock_and_sediment.sediment": 1,
    });
  });

  pgTest(
    "should narrow a facet's counts by the other facets' filters",
    async ({ db }) => {
      // Arrange
      await insertRockAndSediment(db);
      // Act
      const { nature } = await countPublishedFacets(db, {
        ...page,
        material: "rock_and_sediment.rock",
      });
      // Assert
      expect(nature).toEqual({ powder: 1 });
    },
  );

  pgTest(
    "should narrow each active facet's counts by the other active facets alone",
    async ({ db }) => {
      // Arrange
      const [picked, other] = [crypto.randomUUID(), crypto.randomUUID()];
      await db
        .insertInto("manual_group")
        .values([
          { id: picked, name: "ANR CritMet 22f" },
          { id: other, name: "GeoRift" },
        ])
        .execute();
      const rock = "rock_and_sediment.rock";
      const sediment = "rock_and_sediment.sediment";
      await insertPublished(db, { material: rock, manualGroupIds: [picked] });
      await insertPublished(db, {
        material: sediment,
        manualGroupIds: [picked],
      });
      await insertPublished(db, { material: rock, manualGroupIds: [other] });
      await insertPublished(db, { material: sediment });
      // Act
      const { material, manualGroup } = await countPublishedFacets(db, {
        ...page,
        material: rock,
        manualGroup: picked,
      });
      // Assert
      expect({ material, manualGroup }).toEqual({
        material: { rock_and_sediment: 2, [rock]: 1, [sediment]: 1 },
        manualGroup: { [picked]: 1, [other]: 1 },
      });
    },
  );

  pgTest("should count only the published samples", async ({ db }) => {
    // Arrange
    await insertSample(db, { ...draft, nature: "powder" });
    await insertPublished(db, { nature: "thin_section" });
    const withdrawn = await insertPublished(db, { nature: "powder" });
    await setSampleStatus(db, withdrawn.id, "withdrawn");
    const tombstoned = await insertPublished(db, { nature: "powder" });
    await setSampleStatus(db, tombstoned.id, "tombstone");
    // Act
    const { nature } = await countPublishedFacets(db, page);
    // Assert
    expect(nature).toEqual({ thin_section: 1 });
  });

  pgTest.for([
    [undefined, 1],
    [true, 2],
  ] as const)(
    "should count sub-samples only when includeSubSamples is %s",
    async ([includeSubSamples, expected], { db }) => {
      // Arrange
      const parent = await insertPublished(db, { nature: "powder" });
      await insertPublished(db, { nature: "powder", parentIds: [parent.id] });
      // Act
      const { nature } = await countPublishedFacets(db, {
        ...page,
        includeSubSamples,
      });
      // Assert
      expect(nature).toEqual({ powder: expected });
    },
  );

  pgTest.for([
    ["a bbox", { bbox: AUVERGNE }],
    ["a search token", { search: "Basal*" }],
    ["a fuzzy search token", { search: "achondrites" }],
    ["a person facet matching the names", { chiefScientist: "Curie" }],
    ["a person facet matching a linked account", { collectorName: "Pasteur" }],
    ["a text facet", { researchProgramName: "volcan" }],
    ["an age range", { ageMin: 5, ageMax: 30 }],
    [
      "every filter kind",
      {
        nature: "powder",
        manualGroup: GROUP,
        collectorName: "Pasteur",
        search: "Basal* achondrites",
        bbox: AUVERGNE,
      },
    ],
  ] as const)(
    "should match each count to the list total under %s and an active facet",
    async ([, filters], { db }) => {
      // Arrange
      await db
        .insertInto("manual_group")
        .values({ id: GROUP, name: "ANR CritMet 22f" })
        .execute();
      const pasteur = await insertUser(
        db,
        `${crypto.randomUUID()}@univ-lorraine.fr`,
        { firstname: "Louis", name: "Pasteur" },
      );
      await insertPublished(db, {
        name: "Basalte achondrite",
        material: ROCK,
        nature: "powder",
        location: point(5, 45),
        manualGroupIds: [GROUP],
        scientificContext: {
          ...fieldSample("Curie", "Volcans d'Auvergne"),
          collectorUserId: pasteur.id,
        },
        age: numericAge(10, 20),
      });
      await insertPublished(db, {
        name: "Granite de Bretagne",
        material: ROCK,
        nature: "thin_section",
        location: point(-50, 0),
        scientificContext: fieldSample("Darwin", "Glaciers"),
        age: numericAge(500, 600),
      });
      const params = { ...page, ...filters, material: ROCK };
      const listed = await Promise.all(
        NATURES.map(async (nature) => {
          const { total } = await listPublishedSamples(db, {
            ...params,
            nature,
          });
          return [nature, total] as const;
        }),
      );
      // Act
      const { nature } = await countPublishedFacets(db, params);
      // Assert
      expect(nature).toEqual(
        Object.fromEntries(listed.filter(([, total]) => total > 0)),
      );
      expect(nature).toEqual({ powder: 1 });
    },
  );

  pgTest.for(LINK_WRITES)(
    "should follow a sample's links after %s",
    async ([, write], { db }) => {
      // Arrange
      const { params, key, expected } = await write(db);
      // Act
      const counts = await countPublishedFacets(db, { ...page, ...params });
      // Assert
      expect(counts[key]).toEqual(expected);
    },
  );

  pgTest(
    "should count a sample once under a node holding two of its minerals",
    async ({ db }) => {
      // Arrange
      await insertPublished(db, {
        material: "rock_and_sediment.mineral",
        mineralClassifications: [mineral("9.E", 2815), mineral("9.E", 66)],
      });
      // Act
      const { mineralClassification } = await countPublishedFacets(db, page);
      // Assert
      expect(mineralClassification).toEqual({ "9": 1, "9.E": 1 });
    },
  );
});
