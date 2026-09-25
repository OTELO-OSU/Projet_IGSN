import type { SampleAdditionalRole } from "@projet-igsn/domain/sample/additional-role/model";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const ORCID = "0000-0002-3848-0092";

const typed = (
  role: SampleAdditionalRole["role"],
  lastname: string,
): SampleAdditionalRole => ({
  role,
  personUserId: null,
  personFirstname: "Marie",
  personLastname: lastname,
});

const fieldSample = (
  additionalRoles: SampleAdditionalRole[],
): CreateSample => ({
  name: "Basalte du Massif Central",
  nature: "hand_sample",
  type: null,
  collectionMethod: null,
  scientificContext: { provenanceStatus: "field_sample", additionalRoles },
});

const insertAccount = (db: Transactional<DB>) =>
  insertUser(db, `${crypto.randomUUID()}@univ-lorraine.fr`, {
    firstname: "Ada",
    name: "Lovelace",
    orcid: ORCID,
  });

const storedRoles = (db: Transactional<DB>, sampleId: string) =>
  db
    .selectFrom("sample_additional_role")
    .selectAll()
    .where("sample_id", "=", sampleId)
    .execute();

describe("sample additional roles persistence", () => {
  pgTest(
    "should round-trip several rows in the order submitted",
    async ({ db }) => {
      // Arrange
      const roles = [
        typed("project_manager", "Curié"),
        typed("researcher", "Noether"),
        typed("researcher", "Germain"),
        typed("data_manager", "Hopper"),
      ];
      // Act
      const created = await insertSample(db, fieldSample(roles));
      // Assert
      expect(created.scientificContext).toMatchObject({
        additionalRoles: roles,
      });
      expect(await readSample(db, created.id)).toEqual(created);
    },
  );

  pgTest(
    "should read a linked row back with the account's name and ORCID",
    async ({ db }) => {
      // Arrange
      const account = await insertAccount(db);
      // Act
      const created = await insertSample(
        db,
        fieldSample([{ role: "researcher", personUserId: account.id }]),
      );
      // Assert
      expect(created.scientificContext).toMatchObject({
        additionalRoles: [
          {
            role: "researcher",
            personUserId: account.id,
            personFirstname: "Ada",
            personLastname: "Lovelace",
            personOrcid: ORCID,
          },
        ],
      });
    },
  );

  pgTest(
    "should clear the stored rows when the update carries none",
    async ({ db }) => {
      // Arrange
      const created = await insertSample(
        db,
        fieldSample([typed("researcher", "Curié")]),
      );
      // Act
      const updated = await updateSample(db, created.id, fieldSample([]));
      // Assert
      expect(updated?.scientificContext).toMatchObject({
        additionalRoles: [],
      });
      expect(await storedRoles(db, created.id)).toEqual([]);
    },
  );

  pgTest(
    "should refuse a row carrying both a link and a typed name",
    async ({ db }) => {
      // Arrange
      const account = await insertAccount(db);
      // Act & Assert
      await expect(
        insertSample(
          db,
          fieldSample([
            {
              role: "researcher",
              personUserId: account.id,
              personLastname: "Curié",
            },
          ]),
        ),
      ).rejects.toThrow();
    },
  );

  pgTest("should cascade the rows away with the sample", async ({ db }) => {
    // Arrange
    const created = await insertSample(
      db,
      fieldSample([typed("researcher", "Curié")]),
    );
    // Act
    await db.deleteFrom("sample").where("id", "=", created.id).execute();
    // Assert
    expect(await storedRoles(db, created.id)).toEqual([]);
  });

  pgTest(
    "should refuse to delete an account a row is linked to",
    async ({ db }) => {
      // Arrange
      const account = await insertAccount(db);
      await insertSample(
        db,
        fieldSample([{ role: "researcher", personUserId: account.id }]),
      );
      // Act & Assert
      await expect(
        db.deleteFrom("user").where("id", "=", account.id).execute(),
      ).rejects.toThrow();
    },
  );
});
