import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import {
  adminListSamplesResponseSchema,
  adminSampleResponseSchema,
  publicSampleResponseSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { sampleCollaboratorsResponseSchema } from "@projet-igsn/domain/user-sample/user-sample-validator";
import { testClient } from "hono/testing";
import { describe, expect, onTestFinished, vi } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { draft, publishableSample } from "../tests/sample-fixtures.ts";
import { STUB_DATACITE_CONFIG, stubDataCite } from "../tests/stub-datacite.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";

type Db = Kysely<DB>;

const authHeader = { Authorization: "Bearer test-token" };

const PARENT_NOT_ELIGIBLE = { error: "Parent sample not eligible" };

const ADMIN_URL = "http://localhost:3001/admin/";

const FRONTEND_URL = "http://localhost:3000/";

const parentOf = (...parents: Sample[]) =>
  parents.map((parent) => ({
    id: parent.id,
    igsn: parent.igsn,
    name: parent.name,
    material: parent.material,
  }));

const createChild = (db: Db, parentIds: string[], body: CreateSample = draft) =>
  testClient(createApp(db).app).admin.samples.$post(
    { json: { ...body, parentIds } },
    { headers: authHeader },
  );

const ownLocated = {
  ...publishableSample,
  location: {
    position: { type: "point" as const, longitude: 4.83, latitude: 45.76 },
  },
  description: {
    collectionDate: {
      precision: "day" as const,
      start: "2025-03-01",
      end: "2025-03-01",
    },
  },
} satisfies CreateSample;

const updateWithParents = (
  db: Db,
  stored: Sample,
  body: CreateSample,
  parentIds: string[],
) =>
  testClient(createApp(db).app).admin.samples[":id"].$put(
    {
      param: { id: stored.id },
      json: { ...body, parentIds, expectedUpdatedAt: stored.updatedAt },
    },
    { headers: authHeader },
  );

const syntheticDraft = {
  ...draft,
  material: "rock_and_sediment.synthetic_rock_mineral",
} satisfies CreateSample;

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
      const stranger = await insertUser(db, "stranger-3e2@univ-lorraine.fr");
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
        "01890a5d-ac96-774b-83e2-b302099a9999",
      ]);
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual(PARENT_NOT_ELIGIBLE);
      expect(await db.selectFrom("sample").select("id").execute()).toEqual([]);
    },
  );

  pgTest(
    "should answer 400 when two parents come with a non-synthetic material",
    async ({ db }) => {
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
    },
  );

  pgTest("should attach both parents on create", async ({ db }) => {
    // Arrange
    const caller = await provisionUser(db, "test-token", {
      status: "accepted",
    });
    const first = await insertParent(db, caller.id, "published", "Andésite");
    const second = await insertParent(db, caller.id, "published", "Basalte");
    // Act
    const res = await createChild(db, [second.id, first.id], syntheticDraft);
    // Assert
    expect(res.status).toBe(201);
    expect(sampleResponseSchema.parse(await res.json()).data.parents).toEqual(
      parentOf(first, second),
    );
  });

  pgTest(
    "should answer 422 when one of the two parents is not eligible",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const eligible = await insertParent(db, caller.id);
      const ineligible = await insertParent(db, caller.id, "draft");
      // Act
      const res = await createChild(
        db,
        [eligible.id, ineligible.id],
        syntheticDraft,
      );
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual(PARENT_NOT_ELIGIBLE);
      expect(
        await db.selectFrom("sample_parent").select("sample_id").execute(),
      ).toEqual([]);
    },
  );

  pgTest(
    "should inherit no location when the sample has two parents",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const first = await insertParent(db, caller.id, "published", "Andésite");
      const second = await insertParent(db, caller.id, "published", "Basalte");
      expect(first.location).not.toBeNull();
      // Act
      const res = await createChild(db, [first.id, second.id], syntheticDraft);
      // Assert
      expect(res.status).toBe(201);
      expect(sampleResponseSchema.parse(await res.json()).data.location).toBe(
        null,
      );
    },
  );

  pgTest.for(["draft", "published"] as const)(
    "should add a parent to a parentless %s sample, which takes its location and collection date",
    async (status, { db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const parentOwner = await insertUser(db, "keeper@univ-lorraine.fr");
      const parent = await insertParent(db, parentOwner.id);
      const own = await insertSample(db, ownLocated);
      await insertSampleOwner(db, own.id, caller.id);
      if (status === "published") await publishSample(db, own.id);
      const stored = (await readSample(db, own.id)).data;
      // Act
      const res = await updateWithParents(db, stored, ownLocated, [parent.id]);
      // Assert
      expect(res.status).toBe(200);
      const { data } = sampleResponseSchema.parse(await res.json());
      expect({
        parents: data.parents,
        location: data.location,
        collectionDate: data.description?.collectionDate,
        locationRows: await db.selectFrom("location").select("id").execute(),
        collaborators: await collaboratorsOf(db, own.id),
      }).toEqual({
        parents: parentOf(parent),
        location: parent.location,
        collectionDate: parent.description?.collectionDate,
        locationRows: [{ id: expect.any(String) }],
        collaborators: [
          { id: caller.id, role: "owner" },
          { id: parentOwner.id, role: "contributor" },
        ],
      });
    },
  );

  pgTest.for([
    { status: "published" as const, parentPuts: 1 },
    { status: "draft" as const, parentPuts: 0 },
  ])(
    "should PUT the parent's relations alone $parentPuts time(s) when a parent is added to a $status sample",
    async ({ status, parentPuts }, { db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      onTestFinished(() => {
        vi.unstubAllGlobals();
        delete process.env.DATACITE_API_HOST;
      });
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const { id: parentId } = await insertSample(db, publishableSample);
      await insertSampleOwner(db, parentId, caller.id);
      const parent = (await publishSample(
        db,
        parentId,
        "published",
        STUB_DATACITE_CONFIG,
      ))!;
      const own = await insertSample(db, ownLocated);
      await insertSampleOwner(db, own.id, caller.id);
      if (status === "published") {
        await publishSample(db, own.id, "published", STUB_DATACITE_CONFIG);
      }
      const stored = (await readSample(db, own.id)).data;
      fetchMock.mockClear();
      // Act
      const res = await updateWithParents(db, stored, ownLocated, [parentId]);
      // Assert
      expect(res.status).toBe(200);
      expect(
        fetchMock.mock.calls
          .filter(([url]) => String(url).endsWith(`/${parent.igsn}`))
          .map(([, init]) => JSON.parse(init.body).data.attributes),
      ).toEqual(
        Array.from({ length: parentPuts }, () => ({
          relatedIdentifiers: [
            expect.objectContaining({
              relatedIdentifier: stored.igsn,
              relationType: "IsSourceOf",
            }),
          ],
        })),
      );
    },
  );

  pgTest(
    "should answer 502 when DataCite refuses the parent's relations",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      onTestFinished(() => {
        vi.unstubAllGlobals();
        delete process.env.DATACITE_API_HOST;
      });
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const publishedWithDoi = async (input: CreateSample) => {
        const { id } = await insertSample(db, input);
        await insertSampleOwner(db, id, caller.id);
        await publishSample(db, id, "published", STUB_DATACITE_CONFIG);
        return (await readSample(db, id)).data;
      };
      const parent = await publishedWithDoi(publishableSample);
      const own = await publishedWithDoi(ownLocated);
      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith(`/${parent.igsn}`)
          ? new Response("nope", { status: 500 })
          : new Response("{}", { status: 201 }),
      );
      // Act
      const res = await updateWithParents(db, own, ownLocated, [parent.id]);
      // Assert
      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 502,
        body: { error: "DOI sync failed" },
      });
    },
  );

  pgTest(
    "should mail the parent owner when a parent is added to a sample",
    async ({ db }) => {
      // Arrange
      const sendMail = vi.fn().mockResolvedValue(undefined);
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const owner = await insertUser(db, "owner-3e2@univ-lorraine.fr");
      const parent = await insertParent(db, owner.id);
      const own = await insertSample(db, draft);
      await insertSampleOwner(db, own.id, caller.id);
      const app = createApp(db, {
        mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
      }).app;
      // Act
      const res = await testClient(app).admin.samples[":id"].$put(
        {
          param: { id: own.id },
          json: {
            ...draft,
            parentIds: [parent.id],
            expectedUpdatedAt: own.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({ to: ["owner-3e2@univ-lorraine.fr"] }),
        ),
      );
    },
  );

  pgTest(
    "should answer 422 and keep the stored parent when an update drops it",
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
      const res = await updateWithParents(db, child, draft, [other.id]);
      // Assert
      expect(res.status).toBe(422);
      expect((await readSample(db, child.id)).data.parents).toEqual(
        parentOf(parent),
      );
    },
  );

  pgTest.for(["itself", "its child"] as const)(
    "should answer 422 and add no parent when the sample would descend from %s",
    async (target, { db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const { id } = await insertParent(db, caller.id);
      const { id: childId } = await insertSample(db, {
        ...publishableSample,
        parentIds: [id],
      });
      await insertSampleOwner(db, childId, caller.id);
      await publishSample(db, childId);
      const sample = (await readSample(db, id)).data;
      // Act
      const res = await updateWithParents(db, sample, publishableSample, [
        target === "itself" ? sample.id : childId,
      ]);
      // Assert
      expect(res.status).toBe(422);
      expect((await readSample(db, sample.id)).data.parents).toEqual([]);
    },
  );

  pgTest(
    "should answer 422 and add no parent when the added parent is a draft",
    async ({ db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const parent = await insertParent(db, caller.id, "draft");
      const own = await insertSample(db, draft);
      await insertSampleOwner(db, own.id, caller.id);
      // Act
      const res = await updateWithParents(db, own, draft, [parent.id]);
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual(PARENT_NOT_ELIGIBLE);
      expect((await readSample(db, own.id)).data.parents).toEqual([]);
    },
  );

  pgTest.for([
    { label: "a second parent to a one-parent sample", stored: 1 },
    { label: "two parents at once to a parentless sample", stored: 0 },
  ])(
    "should answer 422 and keep the stored parents when adding $label",
    async ({ stored }, { db }) => {
      // Arrange
      const caller = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const first = await insertParent(db, caller.id, "published", "Andésite");
      const second = await insertParent(db, caller.id, "published", "Basalte");
      const kept = [first].slice(0, stored);
      const child = await insertSample(db, {
        ...syntheticDraft,
        parentIds: kept.map(({ id }) => id),
      });
      await insertSampleOwner(db, child.id, caller.id);
      // Act
      const res = await updateWithParents(db, child, syntheticDraft, [
        first.id,
        second.id,
      ]);
      // Assert
      expect(res.status).toBe(422);
      expect((await readSample(db, child.id)).data.parents).toEqual(
        parentOf(...kept),
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
      const stranger = await insertUser(db, "stranger-3e2@univ-lorraine.fr");
      const created = await insertSample(db, {
        ...publishableSample,
        repository: {
          currentArchiveOsu: "OASU",
          currentArchiveLaboratory: "UMR5805",
          currentArchiveContactFirstname: "Camille",
          currentArchiveContactLastname: "Durand",
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
      const stranger = await insertUser(db, "stranger-3e2@univ-lorraine.fr");
      const id =
        status === null
          ? "01890a5d-ac96-774b-83e2-b302099a9999"
          : (await insertParent(db, own ? caller.id : stranger.id, status)).id;
      // Act
      const res = await readParent(db, id);
      // Assert
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Sample not found" });
    },
  );

  pgTest(
    "should mail the parent owner when someone else declares a draft sub-sample",
    async ({ db }) => {
      // Arrange
      const sendMail = vi.fn().mockResolvedValue(undefined);
      await provisionUser(db, "test-token", { status: "accepted" });
      const owner = await insertUser(db, "owner-3e2@univ-lorraine.fr");
      const parent = await insertParent(db, owner.id);
      const app = createApp(db, {
        mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
      }).app;
      // Act
      const res = await testClient(app).admin.samples.$post(
        { json: { ...draft, parentIds: [parent.id] } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(201);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({ to: ["owner-3e2@univ-lorraine.fr"] }),
        ),
      );
    },
  );
});
