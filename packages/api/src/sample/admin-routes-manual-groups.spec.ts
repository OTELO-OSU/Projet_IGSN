import type { Kysely } from "kysely";

import {
  adminListSamplesResponseSchema,
  adminSampleResponseSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { insertSampleCollaborator } from "../user-sample/insert-sample-collaborator.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";

type Db = Kysely<DB>;

const authHeader = { Authorization: "Bearer test-token" };

const MASSIF = "01890a5d-ac96-774b-bcce-b302099a9001";
const ALPES = "01890a5d-ac96-774b-bcce-b302099a9002";

const MASSIF_GROUP = { id: MASSIF, name: "Massif Central 2026" };
const ALPES_GROUP = { id: ALPES, name: "Alpes 2026" };

const draft = {
  name: "Basalte du Massif Central",
  nature: "thin_section" as const,
  type: null,
  collectionMethod: null,
};

const insertGroups = (db: Db) =>
  db.insertInto("manual_group").values([MASSIF_GROUP, ALPES_GROUP]).execute();

const insertMember = (db: Db, groupId: string, userId: string) =>
  db
    .insertInto("manual_group_member")
    .values({ group_id: groupId, user_id: userId })
    .execute();

const attachGroup = (db: Db, sampleId: string, groupId: string) =>
  db
    .insertInto("sample_manual_group")
    .values({ sample_id: sampleId, group_id: groupId })
    .execute();

const readSampleResponse = async (db: Db, id: string) => {
  const res = await testClient(createApp(db).app).admin.samples[":id"].$get(
    { param: { id } },
    { headers: authHeader },
  );
  expect(res.status).toBe(200);
  return adminSampleResponseSchema.parse(await res.json());
};

describe("a sample's manual groups", () => {
  pgTest.for([
    {
      case: "a group the caller belongs to",
      ids: [MASSIF],
      stored: [MASSIF_GROUP],
    },
    { case: "an empty set", ids: [], stored: [] },
  ])("should attach $case on create", async ({ ids, stored }, { db }) => {
    // Arrange
    const caller = await provisionUser(db, "test-token", {
      status: "accepted",
    });
    await insertGroups(db);
    await insertMember(db, MASSIF, caller.id);
    // Act
    const res = await testClient(createApp(db).app).admin.samples.$post(
      { json: { ...draft, manualGroupIds: ids } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(201);
    expect(
      sampleResponseSchema.parse(await res.json()).data.manualGroups,
    ).toEqual(stored);
  });

  pgTest(
    "should answer 422 and write no sample when creating with a group the caller is not in",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      await insertGroups(db);
      // Act
      const res = await testClient(createApp(db).app).admin.samples.$post(
        { json: { ...draft, manualGroupIds: [MASSIF] } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(422);
      expect(await db.selectFrom("sample").select("id").execute()).toEqual([]);
    },
  );

  pgTest(
    "should carry the attached groups in the sample list",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      await insertGroups(db);
      await insertMember(db, MASSIF, caller.id);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, caller.id);
      await attachGroup(db, sample.id, MASSIF);
      // Act
      const res = await testClient(createApp(db).app).admin.samples.$get(
        { query: { page: "1", perPage: "25" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      const { data } = adminListSamplesResponseSchema.parse(await res.json());
      expect(data.map((item) => item.manualGroups)).toEqual([[MASSIF_GROUP]]);
    },
  );

  pgTest.for([
    { case: "replacing them", ids: [MASSIF], stored: [MASSIF_GROUP] },
    { case: "clearing them", ids: [], stored: [] },
  ])(
    "should save the owner's groups on update, $case",
    async ({ ids, stored }, { db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      await insertGroups(db);
      await insertMember(db, MASSIF, caller.id);
      await insertMember(db, ALPES, caller.id);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, caller.id);
      await attachGroup(db, sample.id, ALPES);
      // Act
      const res = await testClient(createApp(db).app).admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...draft,
            manualGroupIds: ids,
            expectedUpdatedAt: sample.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        (await readSampleResponse(db, sample.id)).data.manualGroups,
      ).toEqual(stored);
    },
  );

  pgTest(
    "should accept a stored group the owner has since left",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      await insertGroups(db);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, caller.id);
      await attachGroup(db, sample.id, ALPES);
      // Act
      const res = await testClient(createApp(db).app).admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...draft,
            manualGroupIds: [ALPES],
            expectedUpdatedAt: sample.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        (await readSampleResponse(db, sample.id)).data.manualGroups,
      ).toEqual([ALPES_GROUP]);
    },
  );

  pgTest(
    "should answer 422 and save nothing when the owner submits a group they do not belong to",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      await insertGroups(db);
      await insertMember(db, ALPES, caller.id);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, caller.id);
      await attachGroup(db, sample.id, ALPES);
      // Act
      const res = await testClient(createApp(db).app).admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...draft,
            name: "Basalte renommé",
            manualGroupIds: [MASSIF],
            expectedUpdatedAt: sample.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(422);
      const { data } = await readSampleResponse(db, sample.id);
      expect(data.manualGroups).toEqual([ALPES_GROUP]);
      expect(data.name).toBe(draft.name);
    },
  );

  pgTest.for([
    { case: "resubmits the stored groups", manualGroupIds: [MASSIF] },
    { case: "omits them", manualGroupIds: undefined },
  ])(
    "should keep the stored groups when a contributor $case",
    async ({ manualGroupIds }, { db }) => {
      // Arrange
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      await insertGroups(db);
      await insertMember(db, MASSIF, owner.id);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, owner.id);
      await insertSampleCollaborator(db, sample.id, caller.id, "contributor");
      await attachGroup(db, sample.id, MASSIF);
      // Act
      const res = await testClient(createApp(db).app).admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...draft,
            name: "Basalte relu",
            ...(manualGroupIds ? { manualGroupIds } : {}),
            expectedUpdatedAt: sample.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      const { data } = await readSampleResponse(db, sample.id);
      expect(data.manualGroups).toEqual([MASSIF_GROUP]);
      expect(data.name).toBe("Basalte relu");
    },
  );

  pgTest(
    "should answer 403 when a contributor changes the groups",
    async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      await insertGroups(db);
      await insertMember(db, MASSIF, owner.id);
      await insertMember(db, ALPES, owner.id);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, owner.id);
      await insertSampleCollaborator(db, sample.id, caller.id, "contributor");
      await attachGroup(db, sample.id, MASSIF);
      // Act
      const res = await testClient(createApp(db).app).admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...draft,
            name: "Basalte détourné",
            manualGroupIds: [MASSIF, ALPES],
            expectedUpdatedAt: sample.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(403);
      const { data } = await readSampleResponse(db, sample.id);
      expect(data.manualGroups).toEqual([MASSIF_GROUP]);
      expect(data.name).toBe(draft.name);
    },
  );

  pgTest(
    "should keep the stored groups when a published sample is edited with different ones",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      await insertGroups(db);
      await insertMember(db, MASSIF, caller.id);
      await insertMember(db, ALPES, caller.id);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, caller.id);
      await attachGroup(db, sample.id, MASSIF);
      const published = await publishSample(db, sample.id);
      // Act
      const res = await testClient(createApp(db).app).admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...draft,
            manualGroupIds: [ALPES],
            expectedUpdatedAt: published!.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        (await readSampleResponse(db, sample.id)).data.manualGroups,
      ).toEqual([MASSIF_GROUP]);
    },
  );

  pgTest(
    "should offer the sample owner's groups as options, never the caller's",
    async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const superAdmin = await provisionUser(db, "test-token", {
        status: "accepted",
        superAdmin: true,
      });
      await insertGroups(db);
      await insertMember(db, MASSIF, owner.id);
      await insertMember(db, ALPES, superAdmin.id);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, owner.id);
      // Act
      const { manualGroupOptions } = await readSampleResponse(db, sample.id);
      // Assert
      expect(manualGroupOptions).toEqual([MASSIF_GROUP]);
    },
  );

  pgTest(
    "should validate a super admin's update against the sample owner's groups",
    async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const superAdmin = await provisionUser(db, "test-token", {
        status: "accepted",
        superAdmin: true,
      });
      await insertGroups(db);
      await insertMember(db, MASSIF, owner.id);
      await insertMember(db, ALPES, superAdmin.id);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, owner.id);
      const client = testClient(createApp(db).app);
      const put = (manualGroupIds: string[]) =>
        client.admin.samples[":id"].$put(
          {
            param: { id: sample.id },
            json: {
              ...draft,
              manualGroupIds,
              expectedUpdatedAt: sample.updatedAt,
            },
          },
          { headers: authHeader },
        );
      // Act
      const refused = await put([ALPES]);
      const accepted = await put([MASSIF]);
      // Assert
      expect([refused.status, accepted.status]).toEqual([422, 200]);
      expect(
        (await readSampleResponse(db, sample.id)).data.manualGroups,
      ).toEqual([MASSIF_GROUP]);
    },
  );
  pgTest(
    "should offer no option to a collaborator who does not own the sample",
    async ({ db }) => {
      // Arrange
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      await insertGroups(db);
      await insertMember(db, MASSIF, owner.id);
      await insertMember(db, ALPES, owner.id);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, owner.id);
      await insertSampleCollaborator(db, sample.id, caller.id, "editor");
      await attachGroup(db, sample.id, MASSIF);
      // Act
      const { data, manualGroupOptions } = await readSampleResponse(
        db,
        sample.id,
      );
      // Assert
      expect(manualGroupOptions).toEqual([]);
      expect(data.manualGroups).toEqual([MASSIF_GROUP]);
    },
  );
});
