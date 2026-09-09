import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import {
  adminListSamplesResponseSchema,
  adminSampleResponseSchema,
  publicSampleResponseSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { sampleCollaboratorsResponseSchema } from "@projet-igsn/domain/user-sample/user-sample-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { draft, publishableSample } from "../tests/sample-fixtures.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";
import { setSampleStatus } from "./service/set-sample-status.ts";

type Db = Kysely<DB>;

const authHeader = { Authorization: "Bearer test-token" };

const PARENT_NOT_ELIGIBLE = { error: "Parent sample not eligible" };

async function insertParent(
  db: Db,
  ownerId: string,
  status: Sample["status"] = "published",
): Promise<Sample> {
  const created = await insertSample(db, publishableSample);
  await insertSampleOwner(db, created.id, ownerId);
  if (status === "draft") return created;
  const published = await publishSample(
    db,
    created.id,
    status === "tombstone" ? "published" : status,
  );
  if (status !== "tombstone") return published!;
  return (await setSampleStatus(db, created.id, "tombstone"))!;
}

const parentOf = (parent: Sample) => [
  {
    id: parent.id,
    igsn: parent.igsn,
    name: parent.name,
    material: parent.material,
  },
];

const createChild = (db: Db, parentIds: string[]) =>
  testClient(createApp(db).app).admin.samples.$post(
    { json: { ...draft, parentIds } },
    { headers: authHeader },
  );

const collaboratorsOf = async (db: Db, id: string) => {
  const res = await testClient(createApp(db).app).admin.samples[
    ":id"
  ].collaborators.$get({ param: { id } }, { headers: authHeader });
  expect(res.status).toBe(200);
  const { data } = sampleCollaboratorsResponseSchema.parse(await res.json());
  return data.map(({ id: userId, role }) => ({ id: userId, role }));
};

const readParent = (db: Db, id: string) =>
  testClient(createApp(db).app).admin.samples.parents[":id"].$get(
    { param: { id } },
    { headers: authHeader },
  );

const readSample = async (db: Db, id: string) => {
  const res = await testClient(createApp(db).app).admin.samples[":id"].$get(
    { param: { id } },
    { headers: authHeader },
  );
  expect(res.status).toBe(200);
  return adminSampleResponseSchema.parse(await res.json());
};

describe("a sample's parents", () => {
  pgTest.for(["published", "withdrawn"] as const)(
    "should attach a %s parent on create",
    async (status, { db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const parent = await insertParent(db, caller.id, status);
      // Act
      const res = await createChild(db, [parent.id]);
      // Assert
      expect(res.status).toBe(201);
      expect(sampleResponseSchema.parse(await res.json()).data.parents).toEqual(
        parentOf(parent),
      );
    },
  );

  pgTest.for([
    { superAdmin: false, expected: 422 },
    { superAdmin: true, expected: 201 },
  ])(
    "should answer $expected on a tombstoned parent when superAdmin is $superAdmin",
    async ({ superAdmin, expected }, { db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
        superAdmin,
      });
      const parent = await insertParent(db, caller.id, "tombstone");
      // Act
      const res = await createChild(db, [parent.id]);
      // Assert
      expect(res.status).toBe(expected);
    },
  );

  pgTest(
    "should answer 422 and write no sample when the parent is a draft",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const parent = await insertParent(db, caller.id, "draft");
      // Act
      const res = await createChild(db, [parent.id]);
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual(PARENT_NOT_ELIGIBLE);
      expect(await db.selectFrom("sample").select("id").execute()).toEqual([
        { id: parent.id },
      ]);
    },
  );

  pgTest(
    "should make the parent's owner a contributor on the child",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const parentOwner = await insertUser(db, "keeper@univ-lorraine.fr");
      const parent = await insertParent(db, parentOwner.id);
      // Act
      const res = await createChild(db, [parent.id]);
      // Assert
      expect(res.status).toBe(201);
      const child = sampleResponseSchema.parse(await res.json()).data;
      expect(await collaboratorsOf(db, child.id)).toEqual([
        { id: caller.id, role: "owner" },
        { id: parentOwner.id, role: "contributor" },
      ]);
    },
  );

  pgTest(
    "should leave the creator sole owner of the child when they own the parent",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const parent = await insertParent(db, caller.id);
      // Act
      const res = await createChild(db, [parent.id]);
      // Assert
      expect(res.status).toBe(201);
      const child = sampleResponseSchema.parse(await res.json()).data;
      expect(await collaboratorsOf(db, child.id)).toEqual([
        { id: caller.id, role: "owner" },
      ]);
    },
  );

  pgTest.for([
    { role: null, expected: 422 },
    { role: "contributor" as const, expected: 201 },
  ])(
    "should answer $expected on a withdrawn parent when the caller's role is $role",
    async ({ role, expected }, { db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const stranger = await insertUser(db, "stranger@univ-lorraine.fr");
      const parent = await insertParent(db, stranger.id, "withdrawn");
      if (role) {
        await db
          .insertInto("user_sample")
          .values({ sample_id: parent.id, user_id: caller.id, role })
          .execute();
      }
      // Act
      const res = await createChild(db, [parent.id]);
      // Assert
      expect(res.status).toBe(expected);
    },
  );

  pgTest(
    "should answer 422 and write no sample when the parent does not exist",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      // Act
      const res = await createChild(db, [
        "01890a5d-ac96-774b-bcce-b302099a9999",
      ]);
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual(PARENT_NOT_ELIGIBLE);
      expect(await db.selectFrom("sample").select("id").execute()).toEqual([]);
    },
  );

  pgTest("should answer 400 when a second parent is given", async ({ db }) => {
    // Arrange
    const caller = await provisionUser(db, "test-token", {
      status: "accepted",
    });
    const first = await insertParent(db, caller.id);
    const second = await insertParent(db, caller.id);
    // Act
    const res = await createChild(db, [first.id, second.id]);
    // Assert
    expect(res.status).toBe(400);
    expect(
      await db.selectFrom("sample_parent").select("sample_id").execute(),
    ).toEqual([]);
  });

  pgTest(
    "should answer 400 when an update body carries parentIds",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const parent = await insertParent(db, caller.id);
      const other = await insertParent(db, caller.id);
      const child = await insertSample(db, {
        ...draft,
        parentIds: [parent.id],
      });
      await insertSampleOwner(db, child.id, caller.id);
      // Act
      const res = await createApp(db).app.request(
        `/admin/samples/${child.id}`,
        {
          method: "PUT",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            ...draft,
            parentIds: [other.id],
            expectedUpdatedAt: child.updatedAt,
          }),
        },
      );
      // Assert
      expect(res.status).toBe(400);
      expect((await readSample(db, child.id)).data.parents).toEqual(
        parentOf(parent),
      );
    },
  );

  pgTest(
    "should keep the parent when the sample is updated",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const parent = await insertParent(db, caller.id);
      const child = await insertSample(db, {
        ...draft,
        parentIds: [parent.id],
      });
      await insertSampleOwner(db, child.id, caller.id);
      // Act
      const res = await testClient(createApp(db).app).admin.samples[":id"].$put(
        {
          param: { id: child.id },
          json: {
            ...draft,
            name: "Basalte relu",
            expectedUpdatedAt: child.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      const { data } = await readSample(db, child.id);
      expect(data.parents).toEqual(parentOf(parent));
      expect(data.name).toBe("Basalte relu");
    },
  );

  pgTest("should carry the parent in the sample list", async ({ db }) => {
    // Arrange
    const caller = await provisionUser(db, "test-token", {
      status: "accepted",
    });
    const parent = await insertParent(db, caller.id);
    const child = await insertSample(db, { ...draft, parentIds: [parent.id] });
    await insertSampleOwner(db, child.id, caller.id);
    // Act
    const res = await testClient(createApp(db).app).admin.samples.$get(
      { query: { page: "1", perPage: "25" } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    const { data } = adminListSamplesResponseSchema.parse(await res.json());
    expect(data.find((item) => item.id === child.id)?.parents).toEqual(
      parentOf(parent),
    );
  });

  pgTest(
    "should carry the parent in the public sample payload",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const parent = await insertParent(db, caller.id);
      const child = await insertSample(db, {
        ...publishableSample,
        parentIds: [parent.id],
      });
      await insertSampleOwner(db, child.id, caller.id);
      const published = await publishSample(db, child.id);
      // Act
      const res = await testClient(createApp(db).app).samples[":igsn"].$get({
        param: { igsn: published!.igsn! },
      });
      // Assert
      expect(res.status).toBe(200);
      const { data } = publicSampleResponseSchema.parse(await res.json());
      expect(data.status === "published" && data.parents).toEqual(
        parentOf(parent),
      );
    },
  );
});

describe("the parent read for prefill", () => {
  pgTest(
    "should answer a published parent whole to any caller",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      const stranger = await insertUser(db, "stranger@univ-lorraine.fr");
      const created = await insertSample(db, {
        ...publishableSample,
        repository: {
          currentArchive: "02feahw73",
          currentArchiveContact: "curator@univ-lorraine.fr",
          originalArchiveContact: "collector@univ-lorraine.fr",
        },
      });
      await insertSampleOwner(db, created.id, stranger.id);
      const parent = (await publishSample(db, created.id))!;
      // Act
      const res = await readParent(db, parent.id);
      // Assert
      expect(res.status).toBe(200);
      expect(sampleResponseSchema.parse(await res.json()).data).toEqual(parent);
    },
  );

  pgTest.for([
    { label: "a draft the caller owns", status: "draft" as const, own: true },
    {
      label: "a withdrawn sample out of reach",
      status: "withdrawn" as const,
      own: false,
    },
    { label: "an unknown id", status: null, own: false },
  ])(
    "should answer the same 404 for $label",
    async ({ status, own }, { db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const stranger = await insertUser(db, "stranger@univ-lorraine.fr");
      const id =
        status === null
          ? "01890a5d-ac96-774b-bcce-b302099a9999"
          : (await insertParent(db, own ? caller.id : stranger.id, status)).id;
      // Act
      const res = await readParent(db, id);
      // Assert
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Sample not found" });
    },
  );
});
