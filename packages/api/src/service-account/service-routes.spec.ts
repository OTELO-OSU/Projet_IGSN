import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import {
  listSamplesResponseSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { frozenServiceSampleSchema } from "@projet-igsn/domain/service-account/service-sample-validator";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { setSampleStatus } from "../sample/service/set-sample-status.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { draft, publishableSample } from "../tests/sample-fixtures.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { hashApiKey } from "./api-key.ts";

const KEY = "9tPqk1n0RmWvJ8LxUeYb3sQaZc7Hd2Fg";

const IN_REACH = "UMR7358";
const OUT_OF_REACH = "UMR5275";
const FOREIGN_GROUP_ID = "01890a5d-ac96-774b-bcce-b302099a9003";

const archivedSample = {
  ...publishableSample,
  repository: {
    ...publishableSample.repository,
    currentArchiveContactFirstname: "Camille",
    currentArchiveContactLastname: "Durand",
    originalArchiveContactFirstname: "Louise",
    originalArchiveContactLastname: "Mercier",
  },
} satisfies CreateSample;

const { location: _location, ...subSample } = publishableSample;

async function arrangeAccount(db: Kysely<DB>) {
  const owner = await insertUser(db, "jean.martin@univ-lorraine.fr");
  const account = await insertServiceAccount(
    db,
    "Harvester",
    owner.id,
    hashApiKey(KEY),
  );
  await db
    .insertInto("service_account_managed_institutional_group")
    .values({
      service_account_id: account.id,
      kind: "laboratory",
      code: IN_REACH,
    })
    .execute();
  return { app: createApp(db).app, owner };
}

const inLaboratory = (
  db: Kysely<DB>,
  input: CreateSample,
  laboratory: string,
) =>
  insertSample(db, input, {
    institutionalOrganization: null,
    institutionalOsu: null,
    institutionalLaboratory: laboratory,
  });

const ownedParent = async (db: Kysely<DB>, ownerId: string) => {
  const parent = await inLaboratory(db, publishableSample, IN_REACH);
  await insertSampleOwner(db, parent.id, ownerId);
  await publishSample(db, parent.id);
  return parent;
};

const serviceRequest = (
  app: ReturnType<typeof createApp>["app"],
  method: "GET" | "POST" | "PUT",
  path: string,
  input?: unknown,
) =>
  app.request(`/service/samples${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: input === undefined ? undefined : JSON.stringify(input),
  });

const postSample = (app: ReturnType<typeof createApp>["app"], input: unknown) =>
  serviceRequest(app, "POST", "", input);

const putSample = (
  app: ReturnType<typeof createApp>["app"],
  igsn: string,
  input: unknown,
) => serviceRequest(app, "PUT", `/${igsn}`, input);

const listSamples = (
  app: ReturnType<typeof createApp>["app"],
  params: Record<string, string> = {},
) =>
  serviceRequest(
    app,
    "GET",
    `?${new URLSearchParams({ page: "1", perPage: "10", ...params }).toString()}`,
  );

const fieldSample = {
  ...publishableSample,
  scientificContext: {
    provenanceStatus: "field_sample" as const,
    collectorName: "Georges Cuvier",
  },
} satisfies CreateSample;

describe("GET /service/samples", () => {
  pgTest(
    "should list every published sample whatever the account's managed groups, archive contacts included",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const inReach = await inLaboratory(db, archivedSample, IN_REACH);
      const outOfReach = await inLaboratory(db, archivedSample, OUT_OF_REACH);
      const published = [
        await publishSample(db, inReach.id),
        await publishSample(db, outOfReach.id),
      ].sort((a, b) => a!.igsn!.localeCompare(b!.igsn!));
      // Act
      const res = await listSamples(app);
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(
        JSON.parse(JSON.stringify({ data: published, meta: { total: 2 } })),
      );
    },
  );

  pgTest.for(["draft", "withdrawn", "tombstone"] as const)(
    "should omit a %s sample of the account's managed groups",
    async (status, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const sample = await inLaboratory(db, publishableSample, IN_REACH);
      if (status !== "draft") {
        await publishSample(db, sample.id);
        await setSampleStatus(db, sample.id, status);
      }
      // Act
      const res = await listSamples(app);
      // Assert
      expect(listSamplesResponseSchema.parse(await res.json())).toEqual({
        data: [],
        meta: { total: 0 },
      });
    },
  );

  pgTest(
    "should omit a published sample outside the account's managed groups when editable is true",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const inReach = await inLaboratory(db, archivedSample, IN_REACH);
      const published = await publishSample(db, inReach.id);
      const outOfReach = await inLaboratory(db, archivedSample, OUT_OF_REACH);
      await publishSample(db, outOfReach.id);
      // Act
      const res = await listSamples(app, { editable: "true" });
      // Assert
      expect(await res.json()).toEqual(
        JSON.parse(JSON.stringify({ data: [published], meta: { total: 1 } })),
      );
    },
  );

  pgTest(
    "should window the page while meta.total counts every match",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      for (let index = 0; index < 11; index += 1) {
        const sample = await inLaboratory(
          db,
          { ...draft, name: `Sample ${index}` },
          IN_REACH,
        );
        await publishSample(db, sample.id);
      }
      // Act
      const res = await listSamples(app, { page: "2" });
      // Assert
      const body = listSamplesResponseSchema.parse(await res.json());
      expect(body.data).toHaveLength(1);
      expect(body.meta.total).toBe(11);
    },
  );

  pgTest("should list samples in ascending igsn order", async ({ db }) => {
    // Arrange
    const { app } = await arrangeAccount(db);
    const igsns = ["C".repeat(26), "A".repeat(26), "B".repeat(26)];
    for (const igsn of igsns) {
      const sample = await inLaboratory(db, { ...draft, name: igsn }, IN_REACH);
      await publishSample(db, sample.id);
      await db
        .updateTable("sample")
        .set({ igsn })
        .where("id", "=", sample.id)
        .execute();
    }
    // Act
    const res = await listSamples(app);
    // Assert
    const body = listSamplesResponseSchema.parse(await res.json());
    expect(body.data.map((sample) => sample.igsn)).toEqual([...igsns].sort());
  });

  pgTest("should ignore a status sent by the caller", async ({ db }) => {
    // Arrange
    const { app } = await arrangeAccount(db);
    const published = await inLaboratory(db, publishableSample, IN_REACH);
    await publishSample(db, published.id);
    await inLaboratory(db, draft, IN_REACH);
    // Act
    const res = await listSamples(app, { status: "draft" });
    // Assert
    const body = listSamplesResponseSchema.parse(await res.json());
    expect(body.data.map((sample) => sample.id)).toEqual([published.id]);
    expect(body.meta.total).toBe(1);
  });
});

describe("POST /service/samples", () => {
  pgTest(
    "should publish the sample at once, owned by the account's owner and snapshotting the account's institutional trio",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeAccount(db);
      // Act
      const res = await postSample(app, publishableSample);
      // Assert
      expect(res.status).toBe(201);
      const { data } = sampleResponseSchema.parse(await res.json());
      expect(data).toMatchObject({
        status: "published",
        igsn: generateIgsnSuffix(data.id),
        institutionalOrganization: "04vfs2w97",
        institutionalOsu: "OTELo",
        institutionalLaboratory: IN_REACH,
      });
      expect(
        await db
          .selectFrom("user_sample")
          .select(["user_id", "role"])
          .where("sample_id", "=", data.id)
          .execute(),
      ).toEqual([{ user_id: owner.id, role: "owner" }]);
      const listed = listSamplesResponseSchema.parse(
        await (await listSamples(app, { editable: "true" })).json(),
      );
      expect(listed.data.map((sample) => sample.id)).toEqual([data.id]);
      expect(listed.meta.total).toBe(1);
    },
  );

  pgTest(
    "should list every missing field with its path and write no sample when the body is incomplete",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      await db
        .insertInto("manual_group")
        .values({ id: FOREIGN_GROUP_ID, name: "Alpine Campaign 2026" })
        .execute();
      // Act
      const res = await postSample(app, {
        ...draft,
        manualGroupIds: [FOREIGN_GROUP_ID],
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          { path: "type", code: "type_missing" },
          { path: "material", code: "material_missing" },
          {
            path: "description.collectionDate",
            code: "collection_date_missing",
          },
          { path: "existenceStatus", code: "existence_status_missing" },
          { path: "availabilityStatus", code: "availability_status_missing" },
          {
            path: "scientificContext.provenanceStatus",
            code: "scientific_context_missing",
          },
          { path: "manualGroupIds.0", code: "manual_group_not_attachable" },
        ],
      });
      expect(await db.selectFrom("sample").selectAll().execute()).toEqual([]);
    },
  );

  pgTest(
    "should name the offending field when the body breaks the schema",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await postSample(app, {
        ...publishableSample,
        nature: "pebble",
        institutionalLaboratory: IN_REACH,
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          {
            path: "nature",
            code: "invalid_value",
            message: expect.any(String),
          },
          { code: "unrecognized_keys", message: expect.any(String) },
        ],
      });
    },
  );

  pgTest.for([
    ["an IGSN", "10.60510/ABCDEFGHJKMNPQRSTVWXYZ0123"],
    [
      "a sample id that matches nothing",
      "01990000-0000-7000-8000-000000000000",
    ],
  ] as const)(
    "should report a parent that does not resolve, %s",
    async ([, parentId], { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await postSample(app, {
        ...subSample,
        parentIds: [parentId],
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [{ path: "parentIds.0", code: "parent_not_found" }],
      });
    },
  );

  pgTest(
    "should report a parent outside the owner's reach as not found",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const stranger = await insertUser(db, "mary.stone@univ-lorraine.fr");
      const parent = await inLaboratory(db, publishableSample, OUT_OF_REACH);
      await insertSampleOwner(db, parent.id, stranger.id);
      // Act
      const res = await postSample(app, {
        ...subSample,
        parentIds: [parent.id],
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [{ path: "parentIds.0", code: "parent_not_found" }],
      });
    },
  );

  pgTest(
    "should refuse a body carrying both a parent and a location",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeAccount(db);
      const parent = await ownedParent(db, owner.id);
      // Act
      const res = await postSample(app, {
        ...publishableSample,
        parentIds: [parent.id],
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [{ path: "location", code: "location_inherited_from_parent" }],
      });
    },
  );

  pgTest(
    "should publish a sub-sample with its parent's location",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeAccount(db);
      const parent = await ownedParent(db, owner.id);
      // Act
      const res = await postSample(app, {
        ...subSample,
        scientificContext: fieldSample.scientificContext,
        parentIds: [parent.id],
      });
      // Assert
      expect(res.status).toBe(201);
      const { data } = sampleResponseSchema.parse(await res.json());
      expect(data.location).toEqual(parent.location);
      expect(data.parents.map((sample) => sample.id)).toEqual([parent.id]);
    },
  );
});

describe("the /service mount", () => {
  pgTest.for(
    (
      [
        { rule: "no Authorization header", headers: {}, status: "accepted" },
        {
          rule: "an unknown api key",
          headers: { Authorization: "Bearer nope" },
          status: "accepted",
        },
        {
          rule: "a valid api key whose owner is no longer accepted",
          headers: { Authorization: `Bearer ${KEY}` },
          status: "rejected",
        },
      ] as const
    ).flatMap((forbidden) =>
      (["GET", "POST"] as const).map((method) => ({ ...forbidden, method })),
    ),
  )(
    "should answer 403 to $method /service/samples with $rule",
    async ({ headers, status, method }, { db }) => {
      // Arrange
      const owner = await insertUser(db, "jean.martin@univ-lorraine.fr", {
        status,
      });
      await insertServiceAccount(db, "Harvester", owner.id, hashApiKey(KEY));
      const { app } = createApp(db);
      // Act
      const res = await app.request("/service/samples", { method, headers });
      // Assert
      expect(res.status).toBe(403);
    },
  );
});

const publishedInReach = async (
  db: Kysely<DB>,
  input: CreateSample = publishableSample,
) => (await publishSample(db, (await inLaboratory(db, input, IN_REACH)).id))!;

const storedNames = (db: Kysely<DB>) =>
  db.selectFrom("sample").select("name").execute();

describe("PUT /service/samples/:igsn", () => {
  pgTest(
    "should update an editable field of a published sample in the account's reach, keeping an omitted frozen field",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const created = await publishedInReach(db);
      const { collectionOrigin: _frozen, ...scientificContext } =
        publishableSample.scientificContext;
      // Act
      const res = await putSample(app, created.igsn!, {
        ...publishableSample,
        scientificContext,
        name: "Basalte revisite",
      });
      // Assert
      expect(res.status).toBe(200);
      const { data } = sampleResponseSchema.parse(await res.json());
      expect(data).toMatchObject({
        id: created.id,
        igsn: created.igsn,
        status: "published",
        name: "Basalte revisite",
        scientificContext: created.scientificContext,
      });
    },
  );

  pgTest.for([
    {
      field: "the collector name",
      seed: fieldSample,
      edit: {
        ...fieldSample,
        scientificContext: {
          provenanceStatus: "field_sample",
          collectorName: "Marie Curie",
        },
      },
      path: "scientificContext.collectorName",
    },
    {
      field: "the manual groups",
      seed: publishableSample,
      edit: { ...publishableSample, manualGroupIds: [FOREIGN_GROUP_ID] },
      path: "manualGroupIds.0",
    },
  ])(
    "should refuse a body changing $field and write nothing",
    async ({ seed, edit, path }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const created = await publishedInReach(db, seed);
      // Act
      const res = await putSample(app, created.igsn!, {
        ...edit,
        name: "Nom edite",
      });
      // Assert
      expect(res.status).toBe(403);
      expect(frozenServiceSampleSchema.parse(await res.json())).toEqual({
        error: "Forbidden",
        issues: [{ path, code: "field_frozen" }],
      });
      expect(await storedNames(db)).toEqual([{ name: seed.name }]);
    },
  );

  pgTest.for([
    {
      rule: "an IGSN matching no sample",
      status: 404,
      error: "Not found",
      igsnOf: async () => "A".repeat(26),
    },
    {
      rule: "a draft sample's IGSN",
      status: 404,
      error: "Not found",
      igsnOf: async (db: Kysely<DB>) =>
        generateIgsnSuffix(
          (await inLaboratory(db, publishableSample, IN_REACH)).id,
        ),
    },
    {
      rule: "a published sample outside the account's reach",
      status: 403,
      error: "Forbidden",
      igsnOf: async (db: Kysely<DB>) => {
        const sample = await inLaboratory(db, publishableSample, OUT_OF_REACH);
        return (await publishSample(db, sample.id))!.igsn!;
      },
    },
  ])(
    "should answer $status for $rule",
    async ({ status, error, igsnOf }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const igsn = await igsnOf(db);
      // Act
      const res = await putSample(app, igsn, publishableSample);
      // Assert
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error });
    },
  );

  pgTest.for([
    {
      rule: "attachments",
      edit: { attachments: [] },
      issues: [
        {
          path: "attachments",
          code: "invalid_type",
          message: expect.any(String),
        },
      ],
    },
    {
      rule: "a new publish blocker",
      edit: { type: null },
      issues: [{ path: "type", code: "type_missing" }],
    },
  ])(
    "should refuse a body carrying $rule and write nothing",
    async ({ edit, issues }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const created = await publishedInReach(db);
      // Act
      const res = await putSample(app, created.igsn!, {
        ...publishableSample,
        ...edit,
        name: "Nom edite",
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: "Invalid sample", issues });
      expect(await storedNames(db)).toEqual([{ name: publishableSample.name }]);
    },
  );
});
