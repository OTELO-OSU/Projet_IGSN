import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";

const base = {
  name: "Linked person sample",
  nature: "hand_sample" as const,
  type: null,
  collectionMethod: null,
};

const synthetic = {
  ...base,
  nature: "inapplicable" as const,
  material: "rock_and_sediment.synthetic_rock_mineral",
};

type PersonCase = [
  label: string,
  linked: (userId: string) => CreateSample,
  linkedAndTyped: (userId: string) => CreateSample,
];

const personCases: PersonCase[] = [
  [
    "a field sample's chief scientist",
    (userId) => ({
      ...base,
      scientificContext: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: userId,
      },
    }),
    (userId) => ({
      ...base,
      scientificContext: {
        provenanceStatus: "field_sample",
        chiefScientistUserId: userId,
        chiefScientistFirstname: "Marie",
      },
    }),
  ],
  [
    "a field sample's collector",
    (userId) => ({
      ...base,
      scientificContext: {
        provenanceStatus: "field_sample",
        collectorUserId: userId,
      },
    }),
    (userId) => ({
      ...base,
      scientificContext: {
        provenanceStatus: "field_sample",
        collectorUserId: userId,
        collectorOrcid: "0000-0002-1825-0097",
      },
    }),
  ],
  [
    "a collection specimen's curator",
    (userId) => ({
      ...base,
      scientificContext: {
        provenanceStatus: "collection_specimen",
        collectionCuratorUserId: userId,
      },
    }),
    (userId) => ({
      ...base,
      scientificContext: {
        provenanceStatus: "collection_specimen",
        collectionCuratorUserId: userId,
        collectionCuratorLastname: "Curie",
      },
    }),
  ],
  [
    "a synthesis operator",
    (userId) => ({
      ...synthetic,
      syntheticDetails: { operatorUserId: userId },
    }),
    (userId) => ({
      ...synthetic,
      syntheticDetails: { operatorUserId: userId, operatorLastname: "Curie" },
    }),
  ],
];

const insertAccount = (db: Transactional<DB>) =>
  insertUser(db, `${crypto.randomUUID()}@univ-lorraine.fr`, {
    firstname: "Marie",
    name: "Curié",
    orcid: "0000-0002-1825-0097",
  });

describe("sample person account link persistence", () => {
  pgTest.for(personCases)(
    "should round-trip the account link of %s",
    async ([, linked], { db }) => {
      // Arrange
      const account = await insertAccount(db);
      const input = linked(account.id);
      // Act
      const created = await insertSample(db, input);
      // Assert
      expect(created).toMatchObject(input);
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest.for(personCases)(
    "should refuse %s carrying both a link and a typed name",
    async ([, , linkedAndTyped], { db }) => {
      // Arrange
      const account = await insertAccount(db);
      // Act & Assert
      await expect(
        insertSample(db, linkedAndTyped(account.id)),
      ).rejects.toThrow();
    },
  );

  pgTest(
    "should read a linked person back with the account's name and ORCID",
    async ({ db }) => {
      // Arrange
      const account = await insertAccount(db);
      // Act
      const created = await insertSample(db, {
        ...base,
        scientificContext: {
          provenanceStatus: "field_sample",
          collectorUserId: account.id,
        },
      });
      // Assert
      expect(created.scientificContext).toEqual({
        provenanceStatus: "field_sample",
        collectorUserId: account.id,
        collectorFirstname: "Marie",
        collectorLastname: "Curié",
        collectorOrcid: "0000-0002-1825-0097",
      });
    },
  );

  pgTest(
    "should refuse to delete an account a sample is linked to",
    async ({ db }) => {
      // Arrange
      const account = await insertAccount(db);
      await insertSample(db, {
        ...base,
        scientificContext: {
          provenanceStatus: "field_sample",
          collectorUserId: account.id,
        },
      });
      // Act & Assert
      await expect(
        db.deleteFrom("user").where("id", "=", account.id).execute(),
      ).rejects.toThrow();
    },
  );
});
