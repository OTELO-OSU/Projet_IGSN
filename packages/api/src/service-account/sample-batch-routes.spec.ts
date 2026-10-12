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
import { sql } from "kysely";
import { afterEach, describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { acquireEditLock } from "../sample/service/acquire-edit-lock.ts";
import { PARENT_CYCLE } from "../sample/service/add-sample-parents.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { drainSynchronizationQueue } from "../sample/service/synchronization-worker.ts";
import { insertSampleBatch } from "../tests/insert-sample-batch.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { readSample } from "../tests/read-sample.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { savepointTransactions } from "../tests/savepoint-transactions.ts";
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
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: IN_REACH,
  });
  const keyHolder = await insertUser(db, "key.holder-5b7@univ-lorraine.fr");
  const account = await insertServiceAccount(
    db,
    "Harvester",
    keyHolder.id,
    hashApiKey(KEY),
    owner.id,
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

const postBatch = (
  app: App,
  items: unknown,
  query = "",
  webhook?: { url: string; secret: string },
) =>
  serviceRequest(app, "POST", `/samples/batch${query}`, {
    body: JSON.stringify({ items, webhook }),
  });

const getBatch = (app: App, id: string) =>
  serviceRequest(app, "GET", `/batches/${id}`);

const NEW_BODY = core(COLLECTION_SPECIMEN);

const WEBHOOK = {
  url: "https://partner.example.org/hooks/igsn",
  secret: "a-partner-shared-secret",
};

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

const researchProjectSample = {
  ...publishableSample,
  scientificContext: {
    provenanceStatus: "research_project_sample" as const,
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
    "should queue every created item for publication, owned by the account's samples owner and snapshotting their institutional codes",
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
      expect(await res.json()).toEqual({
        id: expect.any(String),
        items: ["p-1", "p-2"].map((partnerId) => ({
          partnerId,
          id: expect.any(String),
          status: "draft",
          synchronizationStatus: "pending",
          igsn: null,
          synchronizationError: null,
        })),
      });
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
          status: "draft",
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
    "should store the webhook url and secret once for the batch, never answering them",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await postBatch(
        app,
        [
          { partnerId: "p-1", sample: created("Basalt A") },
          { partnerId: "p-2", sample: created("Basalt B") },
        ],
        "",
        WEBHOOK,
      );
      // Assert
      const answered = (await res.json()) as { id: string };
      expect(res.status).toBe(202);
      expect(answered).toEqual({
        id: answered.id,
        items: ["p-1", "p-2"].map((partnerId) => ({
          partnerId,
          id: expect.any(String),
          status: "draft",
          synchronizationStatus: "pending",
          igsn: null,
          synchronizationError: null,
        })),
      });
      expect(
        await db
          .selectFrom("sample_batch_webhook")
          .select(["batch_id", "url", "secret"])
          .execute(),
      ).toEqual([
        { batch_id: answered.id, url: WEBHOOK.url, secret: WEBHOOK.secret },
      ]);
    },
  );

  pgTest.for([
    {
      rule: "a bare array of items",
      body: () => [{ partnerId: "p-1", sample: created("Basalt A") }],
      issue: { code: "invalid_type" },
    },
    {
      rule: "an empty batch",
      body: () => ({ items: [] }),
      issue: { path: "items", code: "too_small" },
    },
    {
      rule: `more than ${MAX_IMPORT_ROWS} items`,
      body: () => ({
        items: Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => ({
          partnerId: `p-${index}`,
          sample: created(`Basalt ${index}`),
        })),
      }),
      issue: { path: "items", code: "too_big" },
    },
    {
      rule: "an item with no partner id",
      body: () => ({ items: [{ sample: created("Basalt A") }] }),
      issue: { path: "items.0.partnerId", code: "invalid_type" },
    },
    {
      rule: "an http webhook url",
      body: () => ({
        items: [{ partnerId: "p-1", sample: created("Basalt A") }],
        webhook: {
          url: "http://partner.example.org/hooks/igsn",
          secret: WEBHOOK.secret,
        },
      }),
      issue: { path: "webhook.url", code: "invalid_format" },
    },
    {
      rule: "an https webhook url to a private address",
      body: () => ({
        items: [{ partnerId: "p-1", sample: created("Basalt A") }],
        webhook: { url: "https://10.0.0.5/hooks/igsn", secret: WEBHOOK.secret },
      }),
      issue: { path: "webhook.url", code: "invalid_format" },
    },
    {
      rule: "a webhook url without secret",
      body: () => ({
        items: [{ partnerId: "p-1", sample: created("Basalt A") }],
        webhook: { url: WEBHOOK.url },
      }),
      issue: { path: "webhook.secret", code: "invalid_type" },
    },
    {
      rule: "a too short webhook secret",
      body: () => ({
        items: [{ partnerId: "p-1", sample: created("Basalt A") }],
        webhook: { url: WEBHOOK.url, secret: "short" },
      }),
      issue: { path: "webhook.secret", code: "too_small" },
    },
  ])("should answer 422 for $rule", async ({ body, issue }, { db }) => {
    // Arrange
    const { app } = await arrangeAccount(db);
    // Act
    const res = await serviceRequest(app, "POST", "/samples/batch", {
      body: JSON.stringify(body()),
    });
    // Assert
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: "Invalid sample",
      issues: [{ ...issue, message: expect.any(String) }],
    });
    expect(await storedNames(db)).toEqual([]);
  });

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
            path: "items.1.sample.production.processSteps",
            code: "custom",
            message: expect.any(String),
          },
        ],
      });
      expect(await storedNames(db)).toEqual([]);
    },
  );

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
      path: "items.0.sample.identification.sampleIdentifier",
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
      path: "items.0.sample.identification.sampleIdentifier",
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
      path: "items.0.sample.responsibility",
      items: async (db: Kysely<DB>) => {
        const body = renamed(
          await publishedIn(db, researchProjectSample),
          "Renamed",
        );
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
      path: "items.1.sample.identification.sampleIdentifier",
      items: async (db: Kysely<DB>) => {
        const sample = await publishedIn(db);
        return [
          { partnerId: "p-1", sample: renamed(sample, "First") },
          { partnerId: "p-2", sample: renamed(sample, "Second") },
        ];
      },
    },
    {
      rule: "a sample another user holds the edit lock of",
      code: "sample_locked",
      path: "items.0.sample.identification.sampleIdentifier",
      items: async (db: Kysely<DB>) => {
        const sample = await publishedIn(db);
        const editor = await insertUser(db, "claire.lock-9d2@univ-lorraine.fr");
        await acquireEditLock(db, sample.id, editor.id);
        return [{ partnerId: "p-1", sample: renamed(sample, "Renamed") }];
      },
    },
    {
      rule: "a parent that is not published",
      code: "parent_not_found",
      path: "items.0.sample.relations.0.targetIdentifier.value",
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
      const existing = await publishedIn(db, researchProjectSample);
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
            batchDuplicates: [],
          },
        ],
      });
      expect(await storedNames(db)).toEqual([{ name: existing.name }]);
    },
  );

  pgTest(
    "should answer 409 naming each other the created items carrying the same name, material and collector",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await postBatch(app, [
        { partnerId: "p-1", sample: created("Basalt A") },
        { partnerId: "p-2", sample: created("Basalt B") },
        { partnerId: "p-3", sample: created("Basalt A") },
      ]);
      // Assert
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({
        error: expect.any(String),
        reason: "duplicates",
        items: [
          { index: 0, duplicates: [], batchDuplicates: [2] },
          { index: 2, duplicates: [], batchDuplicates: [0] },
        ],
      });
      expect(await storedNames(db)).toEqual([]);
    },
  );

  pgTest(
    "should queue the suspected duplicates when the caller confirms them",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const existing = await publishedIn(db, researchProjectSample);
      const copy = withoutIdentifier(core(existing), existing.name);
      // Act
      const res = await postBatch(
        app,
        [
          { partnerId: "p-1", sample: copy },
          { partnerId: "p-2", sample: copy },
        ],
        "?confirmDuplicates=true",
      );
      // Assert
      expect(res.status).toBe(202);
      expect(await storedNames(db)).toEqual([
        { name: existing.name },
        { name: existing.name },
        { name: existing.name },
      ]);
    },
  );

  pgTest.for([
    {
      rule: "withdrawn",
      change: { status: "withdrawn" as const },
      stored: { name: publishableSample.name, status: "withdrawn" },
    },
    {
      rule: "edited but still published",
      change: {
        name: "Edited elsewhere",
        updated_at: sql<Date>`clock_timestamp()`,
      },
      stored: { name: "Edited elsewhere", status: "published" },
    },
  ])(
    "should answer 409 and write nothing when an updated sample is $rule between the checks and the write",
    async ({ change, stored }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const existing = await publishedIn(db);
      stubDataCite(new Response("{}", { status: 200 })).mockImplementation(
        async () => {
          await db
            .updateTable("sample")
            .set(change)
            .where("id", "=", existing.id)
            .execute();
          return new Response("{}", { status: 200 });
        },
      );
      // Act
      const res = await postBatch(app, [
        { partnerId: "p-1", sample: renamed(existing, "Renamed") },
        { partnerId: "p-2", sample: created("Basalt A") },
      ]);
      // Assert
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: "Sample changed, retry" });
      expect(
        await db.selectFrom("sample").select(["name", "status"]).execute(),
      ).toEqual([stored]);
    },
  );

  pgTest(
    "should answer 409 naming a created item suspected to duplicate a sample still queued for publication",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const existing = await publishedIn(db, researchProjectSample);
      await db
        .updateTable("sample")
        .set({ status: "draft", synchronization_status: "pending", igsn: null })
        .where("id", "=", existing.id)
        .execute();
      // Act
      const res = await postBatch(app, [
        {
          partnerId: "p-1",
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
            index: 0,
            duplicates: [{ id: existing.id, igsn: null, name: existing.name }],
            batchDuplicates: [],
          },
        ],
      });
    },
  );

  pgTest.for([
    { label: "a sample", isMember: false },
    { label: "a series member", isMember: true },
  ])(
    "should answer and record an unchanged update of $label as published, without queuing it",
    async ({ isMember }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const published = await publishedIn(db);
      if (isMember)
        await publishedIn(db, {
          ...publishableSample,
          type: "serie_of_sample.core",
          childIds: [published.id],
        });
      const existing = (await readSample(db, published.id))!;
      // Act
      const posted = await postBatch(app, [
        { partnerId: "same", sample: core(existing) },
      ]);
      // Assert
      const answered = (await posted.json()) as { id: string };
      const expected = {
        id: answered.id,
        items: [
          {
            partnerId: "same",
            id: existing.id,
            status: "published",
            synchronizationStatus: "synced",
            igsn: existing.igsn,
            synchronizationError: null,
          },
        ],
      };
      expect(posted.status).toBe(202);
      expect(answered).toEqual(expected);
      expect(await (await getBatch(app, answered.id)).json()).toEqual(expected);
      expect(
        await db
          .selectFrom("sample")
          .select("updated_at")
          .where("id", "=", existing.id)
          .executeTakeFirstOrThrow(),
      ).toEqual({ updated_at: existing.updatedAt });
    },
  );

  pgTest(
    "should queue an update adding only a parent relation",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const parent = await publishedIn(db);
      const existing = await publishedIn(db);
      // Act
      const posted = await postBatch(app, [
        {
          partnerId: "parented",
          sample: {
            ...core(existing),
            relations: subSampleBody(parent.igsn!).relations,
          },
        },
      ]);
      // Assert
      expect(posted.status).toBe(202);
      expect({
        items: ((await posted.json()) as { items: { status: string }[] }).items,
        parents: await db
          .selectFrom("sample_parent")
          .select("parent_id")
          .where("sample_id", "=", existing.id)
          .execute(),
      }).toEqual({
        items: [
          expect.objectContaining({
            status: "published",
            synchronizationStatus: "pending",
          }),
        ],
        parents: [{ parent_id: parent.id }],
      });
    },
  );

  pgTest(
    "should refuse two items naming each other as parent and write nothing",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const first = await publishedIn(db);
      const second = await publishedIn(db);
      // Act
      const res = await postBatch(app, [
        {
          partnerId: "first",
          sample: {
            ...core(first),
            relations: subSampleBody(second.igsn!).relations,
          },
        },
        {
          partnerId: "second",
          sample: {
            ...core(second),
            relations: subSampleBody(first.igsn!).relations,
          },
        },
      ]);
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          {
            path: "items.0.sample.relations",
            code: "custom",
            message: PARENT_CYCLE,
          },
          {
            path: "items.1.sample.relations",
            code: "custom",
            message: PARENT_CYCLE,
          },
        ],
      });
      expect(
        await db.selectFrom("sample_parent").select("sample_id").execute(),
      ).toEqual([]);
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
      await drainSynchronizationQueue(db, STUB_DATACITE_CONFIG, NO_DELAYS);
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
            synchronizationStatus: "synced",
            igsn: generateIgsnSuffix(createdId),
            synchronizationError: null,
          },
          {
            partnerId: "existing",
            id: existing.id,
            status: "published",
            synchronizationStatus: "synced",
            igsn: existing.igsn,
            synchronizationError: null,
          },
        ],
      });
    },
  );

  pgTest(
    "should read a failed publication as a failed draft with its error",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      const { app } = await arrangeAccount(db);
      const posted = await postBatch(app, [
        { partnerId: "p-1", sample: created("Basalt A") },
      ]);
      const { id } = (await posted.json()) as { id: string };
      fetchMock.mockImplementation(FAILING);
      await drainSynchronizationQueue(
        savepointTransactions(db),
        STUB_DATACITE_CONFIG,
        NO_DELAYS,
      );
      // Act
      const res = await getBatch(app, id);
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        id,
        items: [
          {
            partnerId: "p-1",
            status: "draft",
            synchronizationStatus: "failed",
            igsn: null,
            synchronizationError: "DataCite registration failed (HTTP 500)",
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
        const batch = await insertSampleBatch(db, other.id, ownerId, [
          { partnerId: "p-1", create: publishableSample },
        ]);
        return batch.id;
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
            ? JSON.stringify({
                items: [{ partnerId: "p-1", sample: created("A") }],
              })
            : undefined,
      });
      // Assert
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Forbidden" });
      expect(await storedNames(db)).toEqual([]);
    },
  );
});
