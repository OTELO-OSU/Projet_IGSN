import type { ExportSamplesRequest } from "@projet-igsn/domain/sample/export/export-validator";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { Kysely } from "kysely";

import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import { superAdminScope } from "@projet-igsn/domain/user/moderation-scope";
import { describe, expect } from "vitest";

import type { DB } from "../../db.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { publishableSample } from "../../tests/sample-fixtures.ts";
import { insertSampleCollaborator } from "../../user-sample/insert-sample-collaborator.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { insertSample } from "./insert-sample.ts";
import { listExportableSamples } from "./list-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { setSampleStatus } from "./set-sample-status.ts";

const IN_REACH = "UMR7358";
const OUT_OF_REACH = "UMR5275";

async function sampleOf(
  db: Kysely<DB>,
  name: string,
  {
    status = "published",
    material = publishableSample.material,
    ownerId,
    laboratory = null,
  }: {
    status?: "draft" | SetSampleStatusBody["status"];
    material?: CreateSample["material"];
    ownerId?: string;
    laboratory?: string | null;
  } = {},
) {
  const created = await insertSample(
    db,
    { ...publishableSample, name, material },
    {
      institutionalOrganization: null,
      institutionalOsu: null,
      institutionalLaboratory: laboratory,
    },
  );
  if (ownerId) await insertSampleOwner(db, created.id, ownerId);
  if (status !== "draft") {
    await publishSample(
      db,
      created.id,
      status === "tombstone" ? "published" : status,
    );
  }
  if (status === "tombstone")
    await setSampleStatus(db, created.id, "tombstone");
  return created;
}

const namesOf = async (
  db: Kysely<DB>,
  request: ExportSamplesRequest,
  userId: string,
  scope: ModerationScope | null = null,
) =>
  (await listExportableSamples(db, request, userId, scope)).data
    .map((sample) => sample.name)
    .sort();

const managerOf = (callerId: string): ModerationScope => ({
  callerId,
  superAdmin: false,
  managedLaboratories: [IN_REACH],
  managedManualGroupIds: [],
});

async function arrangeReach(db: Kysely<DB>) {
  const marie = await insertUser(db, "marie-x25@univ-lorraine.fr");
  const other = await insertUser(db, "other-x25@univ-lorraine.fr");
  const owned = await sampleOf(db, "Owned out of reach", {
    ownerId: marie.id,
    laboratory: OUT_OF_REACH,
  });
  await sampleOf(db, "Owned in reach", {
    ownerId: marie.id,
    laboratory: IN_REACH,
  });
  const foreignIn = await sampleOf(db, "Foreign in reach", {
    ownerId: other.id,
    laboratory: IN_REACH,
  });
  const foreignOut = await sampleOf(db, "Foreign out of reach", {
    ownerId: other.id,
    laboratory: OUT_OF_REACH,
  });
  return { marie, checked: [owned.id, foreignIn.id, foreignOut.id] };
}

const requestOf = (
  mode: ExportSamplesRequest["mode"],
  moderated: boolean,
  checked: string[],
): ExportSamplesRequest =>
  mode === "ids"
    ? { mode, moderated, ids: checked }
    : { mode, moderated, query: {} };

describe("listExportableSamples", () => {
  pgTest.for([
    ["draft", { status: "draft" }],
    ["withdrawn", { status: "withdrawn" }],
    ["tombstoned", { status: "tombstone" }],
    ["synthetic", { material: "rock_and_sediment.synthetic_rock_mineral" }],
    ["mineral", { material: "rock_and_sediment.mineral" }],
  ] as const)(
    "should skip a %s sample and keep a published one",
    async ([, skipped], { db }) => {
      // Arrange
      const owner = await insertUser(db, "owner-x25@univ-lorraine.fr");
      await sampleOf(db, "Skipped", { ...skipped, ownerId: owner.id });
      await sampleOf(db, "Exported", { ownerId: owner.id });
      // Act
      const names = await namesOf(
        db,
        { mode: "filters", moderated: false, query: {} },
        owner.id,
      );
      // Assert
      expect(names).toEqual(["Exported"]);
    },
  );

  pgTest.for([
    ["ids", false, ["Owned out of reach"]],
    ["ids", true, ["Foreign in reach"]],
    ["filters", false, ["Owned in reach", "Owned out of reach"]],
    ["filters", true, ["Foreign in reach", "Owned in reach"]],
  ] as const)(
    "should keep the %s export with moderated %s inside that list's reach",
    async ([mode, moderated, expected], { db }) => {
      // Arrange
      const { marie, checked } = await arrangeReach(db);
      // Act
      const names = await namesOf(
        db,
        requestOf(mode, moderated, checked),
        marie.id,
        managerOf(marie.id),
      );
      // Assert
      expect(names).toEqual([...expected]);
    },
  );

  pgTest.for([
    [
      "unfiltered",
      { mode: "filters", moderated: false, query: {} },
      ["Mine", "Shared"],
    ],
    [
      "shared filter",
      { mode: "filters", moderated: false, query: { ownership: "shared" } },
      ["Shared"],
    ],
    [
      "mine filter",
      { mode: "filters", moderated: false, query: { ownership: "mine" } },
      ["Mine"],
    ],
  ] as const)(
    "should export a sample shared with the caller in the %s export",
    async ([, request, expected], { db }) => {
      // Arrange
      const marie = await insertUser(db, "marie-x25@univ-lorraine.fr");
      const other = await insertUser(db, "other-x25@univ-lorraine.fr");
      await sampleOf(db, "Mine", { ownerId: marie.id });
      const shared = await sampleOf(db, "Shared", { ownerId: other.id });
      await insertSampleCollaborator(db, shared.id, marie.id, "editor");
      // Act
      const names = await namesOf(db, request, marie.id);
      // Assert
      expect(names).toEqual([...expected]);
    },
  );

  pgTest.for(["ids", "filters"] as const)(
    "should refuse a moderated %s export without moderation scope as 403",
    async (mode, { db }) => {
      // Arrange
      const { marie, checked } = await arrangeReach(db);
      // Act
      const exported = listExportableSamples(
        db,
        requestOf(mode, true, checked),
        marie.id,
        null,
      );
      // Assert
      await expect(exported).rejects.toMatchObject({ status: 403 });
    },
  );

  pgTest(
    "should refuse an export over the row cap as 422",
    async ({ db }) => {
      // Arrange
      await db
        .insertInto("sample")
        .values(
          Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => ({
            id: crypto.randomUUID(),
            name: `Sample ${index}`,
            igsn: `CNRS${String(index).padStart(10, "0")}`,
            material: publishableSample.material,
            status: "published" as const,
          })),
        )
        .execute();
      const callerId = crypto.randomUUID();
      // Act
      const exported = listExportableSamples(
        db,
        { mode: "filters", moderated: true, query: {} },
        callerId,
        superAdminScope(callerId),
      );
      // Assert
      await expect(exported).rejects.toMatchObject({ status: 422 });
    },
    30_000,
  );
});
