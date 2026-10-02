import type { CoreSample } from "@projet-igsn/domain/sample/core/core-sample-schema";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { toParentIdentifierType } from "@projet-igsn/domain/sample/core/core-relation-schema";
import { COLLECTION_SPECIMEN } from "@projet-igsn/domain/sample/core/core-sample-fixture";
import { SUB_SAMPLE } from "@projet-igsn/domain/sample/core/core-sample-variant-fixture";
import { toCoreSample } from "@projet-igsn/domain/sample/core/to-core-sample";
import { IMPORT_MAX_BYTES } from "@projet-igsn/domain/sample/import/import-validator";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import { afterEach, describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { createSampleBatchRepository } from "../sample-batch/repository.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { drainPublishingQueue } from "../sample/service/publishing-worker.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { STUB_DATACITE_CONFIG, stubDataCite } from "../tests/stub-datacite.ts";
import { hashApiKey } from "./api-key.ts";

const KEY = "9tPqk1n0RmWvJ8LxUeYb3sQaZc7Hd2Fg";

const FRONTEND_URL = "http://localhost:3000/";

const IN_REACH = "UMR7358";
const OUT_OF_REACH = "UMR5275";

const NO_DELAYS = [0, 0, 0, 0, 0];

const FAILING = () =>
  Promise.resolve(new Response("DataCite is down", { status: 500 }));

type App = ReturnType<typeof createApp>["app"];

const core = (sample: Sample) => toCoreSample(sample, FRONTEND_URL);

async function arrangeAccount(db: Kysely<DB>) {
  const owner = await insertUser(db, "jean.martin-5b7@univ-lorraine.fr", {
    firstname: "Jean",
    name: "Martin",
  });
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

const publishedIn = async (
  db: Kysely<DB>,
  input: CreateSample = publishableSample,
  laboratory = IN_REACH,
) => (await publishSample(db, (await inLaboratory(db, input, laboratory)).id))!;

const serviceRequest = (
  app: App,
  method: "GET" | "POST",
  path: string,
  { body, key = KEY }: { body?: string; key?: string | null } = {},
) =>
  app.request(`/service${path}`, {
    method,
    headers: {
      ...(key === null ? {} : { Authorization: `Bearer ${key}` }),
      "Content-Type": "application/json",
    },
    body,
  });

const postBatch = (app: App, items: unknown, query = "") =>
  serviceRequest(app, "POST", `/samples/batch${query}`, {
    body: JSON.stringify(items),
  });

const getBatch = (app: App, id: string) =>
  serviceRequest(app, "GET", `/batches/${id}`);

const NEW_BODY = core(COLLECTION_SPECIMEN);

const withoutIdentifier = (body: CoreSample, name: string) => {
  const { sampleIdentifier: _created, ...identification } = body.identification;
  return {
    ...body,
    identification: {
      ...identification,
      titles: [{ value: name, titleType: "Main" as const }],
    },
  };
};

const created = (name: string) => withoutIdentifier(NEW_BODY, name);

const renamed = (sample: Sample, name: string): CoreSample => {
  const body = core(sample);
  return {
    ...body,
    identification: {
      ...body.identification,
      titles: [{ value: name, titleType: "Main" }],
    },
  };
};

const fieldSample = {
  ...publishableSample,
  scientificContext: {
    provenanceStatus: "field_sample" as const,
    additionalRoles: [],
    collectorFirstname: "Georges",
    collectorLastname: "Cuvier",
  },
} satisfies CreateSample;

const PROCESS_STEPS = core(SUB_SAMPLE).production.processSteps?.filter(
  (step) => step.timestampStart != null,
);

const subSampleBody = (igsn: string) => {
  const { location: _inherited, ...production } = NEW_BODY.production;
  return {
    ...created("Thin section"),
    production,
    relations: [
      {
        relationType: "IsDerivedFrom",
        targetIdentifier: {
          value: igsn,
          identifierType: toParentIdentifierType(igsn),
        },
        targetTitles: [{ value: "Parent block", titleType: "Main" }],
        targetResourceType: "PhysicalObject",
      },
    ],
  };
};

const storedNames = (db: Kysely<DB>) =>
  db.selectFrom("sample").select("name").orderBy("name").execute();

const idNamed = async (db: Kysely<DB>, name: string) =>
  (
    await db
      .selectFrom("sample")
      .select("id")
      .where("name", "=", name)
      .executeTakeFirstOrThrow()
  ).id;

describe("POST /service/samples/batch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DATACITE_API_HOST;
  });

  pgTest(
    "should queue every created item for publication, owned by the account's owner and snapshotting the account's trio",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeAccount(db);
      // Act
      const res = await postBatch(app, [
        { partnerId: "p-1", sample: created("Basalt A") },
        { partnerId: "p-2", sample: created("Basalt B") },
      ]);
      // Assert
      expect(res.status).toBe(202);
      expect(await res.json()).toEqual({ id: expect.any(String) });
      expect(
        await db
          .selectFrom("sample")
          .innerJoin("user_sample", "user_sample.sample_id", "sample.id")
          .select([
            "sample.name",
            "sample.status",
            "sample.institutional_organization",
            "sample.institutional_osu",
            "sample.institutional_laboratory",
            "user_sample.user_id",
            "user_sample.role",
          ])
          .orderBy("sample.name")
          .execute(),
      ).toEqual(
        ["Basalt A", "Basalt B"].map((name) => ({
          name,
          status: "publishing",
          institutional_organization: "04vfs2w97",
          institutional_osu: "OTELo",
          institutional_laboratory: IN_REACH,
          user_id: owner.id,
          role: "owner",
        })),
      );
    },
  );

  pgTest(
    "should refuse the whole batch with index-prefixed issues when one item is invalid",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const invalid = created("Basalt B");
      // Act
      const res = await postBatch(app, [
        { partnerId: "p-1", sample: created("Basalt A") },
        {
          partnerId: "p-2",
          sample: {
            ...invalid,
            production: { ...invalid.production, processSteps: PROCESS_STEPS },
          },
        },
      ]);
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          {
            path: "1.production.processSteps",
            code: "custom",
            message: expect.any(String),
          },
        ],
      });
      expect(await storedNames(db)).toEqual([]);
    },
  );

  pgTest.for([
    {
      rule: "an empty batch",
      items: () => [],
      issue: { code: "too_small" },
    },
    {
      rule: `more than ${MAX_IMPORT_ROWS} items`,
      items: () =>
        Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => ({
          partnerId: `p-${index}`,
          sample: created(`Basalt ${index}`),
        })),
      issue: { code: "too_big" },
    },
    {
      rule: "an item with no partner id",
      items: () => [{ sample: created("Basalt A") }],
      issue: { path: "0.partnerId", code: "invalid_type" },
    },
  ])("should answer 422 for $rule", async ({ items, issue }, { db }) => {
    // Arrange
    const { app } = await arrangeAccount(db);
    // Act
    const res = await postBatch(app, items());
    // Assert
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: "Invalid sample",
      issues: [{ ...issue, message: expect.any(String) }],
    });
  });

  pgTest("should answer 413 for a body over the size limit", async ({ db }) => {
    // Arrange
    const { app } = await arrangeAccount(db);
    // Act
    const res = await serviceRequest(app, "POST", "/samples/batch", {
      body: " ".repeat(IMPORT_MAX_BYTES + 1),
    });
    // Assert
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "Payload too large" });
  });

  pgTest.for([
    {
      rule: "an IGSN no published sample carries",
      code: "sample_not_found",
      path: "0.identification.sampleIdentifier",
      items: async () => [
        {
          partnerId: "p-1",
          sample: {
            ...NEW_BODY,
            identification: {
              ...NEW_BODY.identification,
              sampleIdentifier: "A".repeat(26),
            },
          },
        },
      ],
    },
    {
      rule: "a sample outside the account's reach",
      code: "sample_not_editable",
      path: "0.identification.sampleIdentifier",
      items: async (db: Kysely<DB>) => [
        {
          partnerId: "p-1",
          sample: renamed(
            await publishedIn(db, publishableSample, OUT_OF_REACH),
            "Renamed",
          ),
        },
      ],
    },
    {
      rule: "an edit of a frozen field",
      code: "field_frozen",
      path: "0.responsibility",
      items: async (db: Kysely<DB>) => {
        const body = renamed(await publishedIn(db, fieldSample), "Renamed");
        return [
          {
            partnerId: "p-1",
            sample: {
              ...body,
              responsibility: body.responsibility.map((agentRole) =>
                agentRole.roles[0] === "Collector"
                  ? {
                      ...agentRole,
                      agent: { ...agentRole.agent, lastname: "Curie" },
                    }
                  : agentRole,
              ),
            },
          },
        ];
      },
    },
    {
      rule: "the same IGSN on two items",
      code: "duplicate_sample_key",
      path: "1.identification.sampleIdentifier",
      items: async (db: Kysely<DB>) => {
        const sample = await publishedIn(db);
        return [
          { partnerId: "p-1", sample: renamed(sample, "First") },
          { partnerId: "p-2", sample: renamed(sample, "Second") },
        ];
      },
    },
    {
      rule: "a parent that is not published",
      code: "parent_not_found",
      path: "0.relations.0.targetIdentifier.value",
      items: async (db: Kysely<DB>) => [
        {
          partnerId: "p-1",
          sample: subSampleBody(
            generateIgsnSuffix(
              (await inLaboratory(db, publishableSample, IN_REACH)).id,
            ),
          ),
        },
      ],
    },
  ])(
    "should refuse $rule with $code at its item's path",
    async ({ items, code, path }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const body = await items(db);
      const before = await storedNames(db);
      // Act
      const res = await postBatch(app, body);
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [{ path, code }],
      });
      expect(await storedNames(db)).toEqual(before);
    },
  );

  pgTest(
    "should answer 409 naming the item suspected to duplicate a published sample",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const existing = await publishedIn(db, fieldSample);
      // Act
      const res = await postBatch(app, [
        { partnerId: "p-1", sample: created("Basalt A") },
        {
          partnerId: "p-2",
          sample: withoutIdentifier(core(existing), existing.name),
        },
      ]);
      // Assert
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({
        error: expect.any(String),
        reason: "duplicates",
        items: [
          {
            index: 1,
            duplicates: [
              { id: existing.id, igsn: existing.igsn, name: existing.name },
            ],
          },
        ],
      });
      expect(await storedNames(db)).toEqual([{ name: existing.name }]);
    },
  );

  pgTest(
    "should queue the suspected duplicate when the caller confirms it",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const existing = await publishedIn(db, fieldSample);
      // Act
      const res = await postBatch(
        app,
        [
          {
            partnerId: "p-1",
            sample: withoutIdentifier(core(existing), existing.name),
          },
        ],
        "?confirmDuplicates=true",
      );
      // Assert
      expect(res.status).toBe(202);
      expect(await storedNames(db)).toEqual([
        { name: existing.name },
        { name: existing.name },
      ]);
    },
  );

  pgTest(
    "should answer 503 and write nothing when DataCite does not answer",
    async ({ db }) => {
      // Arrange
      stubDataCite(new Response("", { status: 503 }));
      const { app } = await arrangeAccount(db);
      // Act
      const res = await postBatch(app, [
        { partnerId: "p-1", sample: created("Basalt A") },
      ]);
      // Assert
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "DataCite unavailable" });
      expect(await storedNames(db)).toEqual([]);
    },
  );
});

describe("GET /service/batches/:id", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DATACITE_API_HOST;
  });

  pgTest(
    "should list each item by partner id, published with its IGSN once the queue drained",
    async ({ db }) => {
      // Arrange
      stubDataCite(new Response("{}", { status: 201 }));
      const { app } = await arrangeAccount(db);
      const existing = await publishedIn(db);
      const posted = await postBatch(app, [
        { partnerId: "new", sample: created("Basalt A") },
        {
          partnerId: "existing",
          sample: renamed(existing, "Basalt revisited"),
        },
      ]);
      const { id } = (await posted.json()) as { id: string };
      await drainPublishingQueue(db, STUB_DATACITE_CONFIG, NO_DELAYS);
      const createdId = await idNamed(db, "Basalt A");
      // Act
      const res = await getBatch(app, id);
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        id,
        items: [
          {
            partnerId: "new",
            id: createdId,
            status: "published",
            igsn: generateIgsnSuffix(createdId),
            publishingError: null,
          },
          {
            partnerId: "existing",
            id: existing.id,
            status: "published",
            igsn: existing.igsn,
            publishingError: null,
          },
        ],
      });
    },
  );

  pgTest(
    "should read a failed publication as publish_failed with its error",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      const { app } = await arrangeAccount(db);
      const posted = await postBatch(app, [
        { partnerId: "p-1", sample: created("Basalt A") },
      ]);
      const { id } = (await posted.json()) as { id: string };
      fetchMock.mockImplementation(FAILING);
      await drainPublishingQueue(db, STUB_DATACITE_CONFIG, NO_DELAYS);
      // Act
      const res = await getBatch(app, id);
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        id,
        items: [
          {
            partnerId: "p-1",
            status: "publish_failed",
            publishingError: "DataCite registration failed (HTTP 500)",
          },
        ],
      });
    },
  );

  pgTest.for([
    {
      rule: "a malformed id",
      status: 400,
      idOf: async () => "not-a-uuid",
    },
    {
      rule: "an unknown batch",
      status: 404,
      idOf: async () => "01890a5d-ac96-774b-8fb4-b302099a9010",
    },
    {
      rule: "another account's batch",
      status: 404,
      idOf: async (db: Kysely<DB>, ownerId: string) => {
        const other = await insertServiceAccount(db, "Other", ownerId);
        return createSampleBatchRepository(db).create({
          serviceAccountId: other.id,
          ownerId,
          groups: {
            institutionalOrganization: null,
            institutionalOsu: null,
            institutionalLaboratory: IN_REACH,
          },
          items: [{ partnerId: "p-1", create: publishableSample }],
        });
      },
    },
  ])("should answer $status for $rule", async ({ status, idOf }, { db }) => {
    // Arrange
    const { app, owner } = await arrangeAccount(db);
    const id = await idOf(db, owner.id);
    // Act
    const res = await getBatch(app, id);
    // Assert
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });
});

describe("the /service batch routes", () => {
  pgTest.for([
    { method: "POST" as const, path: "/samples/batch", key: null },
    { method: "POST" as const, path: "/samples/batch", key: "unknown-key" },
    {
      method: "GET" as const,
      path: "/batches/01890a5d-ac96-774b-8fb4-b302099a9010",
      key: null,
    },
    {
      method: "GET" as const,
      path: "/batches/01890a5d-ac96-774b-8fb4-b302099a9010",
      key: "unknown-key",
    },
  ])(
    "should answer 403 to $method $path with key $key",
    async ({ method, path, key }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await serviceRequest(app, method, path, {
        key,
        body:
          method === "POST"
            ? JSON.stringify([{ partnerId: "p-1", sample: created("A") }])
            : undefined,
      });
      // Assert
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Forbidden" });
      expect(await storedNames(db)).toEqual([]);
    },
  );
});
