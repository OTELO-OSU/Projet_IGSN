import type { DuplicateCriteria } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";

import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { tokenEmail } from "../../tests/provision-user.ts";
import { findDuplicateSamples } from "./find-duplicate-samples.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { setSampleStatus } from "./set-sample-status.ts";

const MATERIAL = "rock_and_sediment.sediment.exogenous_detritic.clay";

const NAME = "Échantillon de Basalte";

const COLLECTOR = { firstname: "Inge", name: "Lehmann" };

const fieldSample = (collector: {
  collectorUserId?: string;
  collectorFirstname?: string;
  collectorLastname?: string;
}) =>
  ({
    provenanceStatus: "field_sample",
    additionalRoles: [],
    ...collector,
  }) satisfies CreateSample["scientificContext"];

const sample = (overrides: Partial<CreateSample> = {}): CreateSample => ({
  name: NAME,
  nature: "hand_sample",
  type: null,
  collectionMethod: null,
  material: MATERIAL,
  scientificContext: fieldSample({
    collectorFirstname: COLLECTOR.firstname,
    collectorLastname: COLLECTOR.name,
  }),
  ...overrides,
});

const publish = async (
  db: Transactional<DB>,
  overrides: Partial<CreateSample> = {},
  status: SetSampleStatusBody["status"] = "published",
): Promise<Sample> => {
  const created = await insertSample(db, sample(overrides));
  const published = (await publishSample(db, created.id))!;
  return status === "published"
    ? published
    : (await setSampleStatus(db, created.id, status))!;
};

const CRITERIA: DuplicateCriteria = {
  name: NAME,
  material: MATERIAL,
  collectorUserId: null,
  collectorFirstname: COLLECTOR.firstname,
  collectorLastname: COLLECTOR.name,
};

const NO_COLLECTOR_CRITERIA: DuplicateCriteria = {
  ...CRITERIA,
  collectorFirstname: null,
  collectorLastname: null,
};

const linkedCriteria = (collectorUserId: string): DuplicateCriteria => ({
  ...CRITERIA,
  collectorUserId,
  collectorFirstname: null,
  collectorLastname: null,
});

const found = ({ id, igsn, name }: Sample) => [{ id, igsn, name }];

describe("findDuplicateSamples", () => {
  pgTest(
    "should report a published sample carrying the same name, material and collector",
    async ({ db }) => {
      // Arrange
      const existing = await publish(db);
      // Act
      const duplicates = await findDuplicateSamples(db, CRITERIA);
      // Assert
      expect(duplicates).toEqual(found(existing));
    },
  );

  pgTest.for([
    ["the name", { name: "Basalte du Cantal" }],
    ["the material", { material: "rock_and_sediment.rock" }],
    ["the collector", { collectorLastname: "Curie" }],
  ] as [string, Partial<DuplicateCriteria>][])(
    "should report nothing when %s differs",
    async ([, differing], { db }) => {
      // Arrange
      await publish(db);
      // Act
      const duplicates = await findDuplicateSamples(db, {
        ...CRITERIA,
        ...differing,
      });
      // Assert
      expect(duplicates).toEqual([]);
    },
  );

  pgTest.for([
    "échantillon de basalte",
    "ECHANTILLON DE BASALTE",
    "  Echantillon de Basalte  ",
  ])(
    "should match the name %s whatever its case, accents and surrounding spaces",
    async (name, { db }) => {
      // Arrange
      const existing = await publish(db);
      // Act
      const duplicates = await findDuplicateSamples(db, { ...CRITERIA, name });
      // Assert
      expect(duplicates).toEqual(found(existing));
    },
  );

  pgTest(
    "should match two linked collectors carrying the same account",
    async ({ db }) => {
      // Arrange
      const account = await insertUser(db, tokenEmail("inge"), COLLECTOR);
      const existing = await publish(db, {
        scientificContext: fieldSample({ collectorUserId: account.id }),
      });
      // Act
      const duplicates = await findDuplicateSamples(
        db,
        linkedCriteria(account.id),
      );
      // Assert
      expect(duplicates).toEqual(found(existing));
    },
  );

  pgTest(
    "should not match two linked collectors carrying different accounts, even with equal names",
    async ({ db }) => {
      // Arrange
      const account = await insertUser(db, tokenEmail("inge"), COLLECTOR);
      const other = await insertUser(db, tokenEmail("inge.other"), COLLECTOR);
      await publish(db, {
        scientificContext: fieldSample({ collectorUserId: account.id }),
      });
      // Act
      const duplicates = await findDuplicateSamples(
        db,
        linkedCriteria(other.id),
      );
      // Assert
      expect(duplicates).toEqual([]);
    },
  );

  pgTest(
    "should match a typed subject against a linked candidate on the account's resolved names",
    async ({ db }) => {
      // Arrange
      const account = await insertUser(db, tokenEmail("inge"), COLLECTOR);
      const existing = await publish(db, {
        scientificContext: fieldSample({ collectorUserId: account.id }),
      });
      // Act
      const duplicates = await findDuplicateSamples(db, CRITERIA);
      // Assert
      expect(duplicates).toEqual(found(existing));
    },
  );

  pgTest(
    "should match a linked subject against a typed candidate on the account's resolved names",
    async ({ db }) => {
      // Arrange
      const account = await insertUser(db, tokenEmail("inge"), COLLECTOR);
      const existing = await publish(db);
      // Act
      const duplicates = await findDuplicateSamples(
        db,
        linkedCriteria(account.id),
      );
      // Assert
      expect(duplicates).toEqual(found(existing));
    },
  );

  pgTest(
    "should report a published sample carrying no collector either",
    async ({ db }) => {
      // Arrange
      const existing = await publish(db, {
        scientificContext: fieldSample({}),
      });
      // Act
      const duplicates = await findDuplicateSamples(db, NO_COLLECTOR_CRITERIA);
      // Assert
      expect(duplicates).toEqual(found(existing));
    },
  );

  pgTest(
    "should never report a candidate carrying a collector against one carrying none",
    async ({ db }) => {
      // Arrange
      await publish(db);
      // Act
      const duplicates = await findDuplicateSamples(db, NO_COLLECTOR_CRITERIA);
      // Assert
      expect(duplicates).toEqual([]);
    },
  );

  pgTest.for([
    ["a typed", false],
    ["a linked", true],
  ] as [string, boolean][])(
    "should never report a candidate carrying no collector against %s one",
    async ([, linked], { db }) => {
      // Arrange
      const account = await insertUser(db, tokenEmail("inge"), COLLECTOR);
      await publish(db, { scientificContext: fieldSample({}) });
      // Act
      const duplicates = await findDuplicateSamples(
        db,
        linked ? linkedCriteria(account.id) : CRITERIA,
      );
      // Assert
      expect(duplicates).toEqual([]);
    },
  );

  pgTest.for(["draft", "withdrawn", "tombstone"] as const)(
    "should never report a %s sample",
    async (status, { db }) => {
      // Arrange
      if (status === "draft") {
        await insertSample(db, sample());
      } else {
        await publish(db, {}, status);
      }
      // Act
      const duplicates = await findDuplicateSamples(db, CRITERIA);
      // Assert
      expect(duplicates).toEqual([]);
    },
  );

  pgTest("should exclude the sample being checked", async ({ db }) => {
    // Arrange
    const subject = await publish(db);
    // Act
    const duplicates = await findDuplicateSamples(db, CRITERIA, subject.id);
    // Assert
    expect(duplicates).toEqual([]);
  });

  pgTest(
    "should report a parent sharing the three criteria",
    async ({ db }) => {
      // Arrange
      const parent = await publish(db);
      const child = await publish(db, { parentIds: [parent.id] });
      // Act
      const duplicates = await findDuplicateSamples(db, CRITERIA, child.id);
      // Assert
      expect(duplicates).toEqual(found(parent));
    },
  );
});
