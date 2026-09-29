import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { draft } from "../../tests/sample-fixtures.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { countPublishedFacets } from "./count-facets.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { setSampleStatus } from "./set-sample-status.ts";

const page = { page: 1, perPage: 10 };

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
});
