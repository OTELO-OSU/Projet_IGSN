import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { adminSampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { join } from "node:path";
import { afterEach, describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertOwned } from "../tests/insert-owned.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { draft, publishableSample } from "../tests/sample-fixtures.ts";
import { seriesIdOf } from "../tests/series-id-of.ts";
import {
  doiUrlOf,
  hasPartPutsOf,
  registerDois,
  STUB_DATACITE_CONFIG,
  stubDataCite,
} from "../tests/stub-datacite.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { acquireEditLock } from "./service/acquire-edit-lock.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";
import { drainSynchronizationQueue } from "./service/synchronization-worker.ts";

type Db = Kysely<DB>;

const authHeader = { Authorization: "Bearer test-token" };

const CHILD_NOT_ELIGIBLE = { error: "Child sample not eligible" };

const CHILDREN_NEED_PUBLICATION = { error: "Children need a published series" };

const CORE_SERIES = "serie_of_sample.core";

const MANAGED_LABORATORY = "UMR7358";

const ATTACHMENTS_DIR = join(import.meta.dirname, "..", "..", "attachments");

const relatedOf = (...samples: Sample[]) =>
  samples.map(({ id, igsn, name, material }) => ({ id, igsn, name, material }));

const insertCore = (db: Db, ownerId: string, name: string) =>
  insertOwned(db, ownerId, { type: "core", name });

const createSeries = (db: Db, childIds: string[]) =>
  testClient(createApp(db).app).admin.samples.$post(
    { json: { ...draft, type: CORE_SERIES, childIds } },
    { headers: authHeader },
  );

const putSample = (db: Db, sample: Sample, body: CreateSample) =>
  testClient(createApp(db).app).admin.samples[":id"].$put(
    {
      param: { id: sample.id },
      json: { ...body, expectedUpdatedAt: sample.updatedAt },
    },
    { headers: authHeader },
  );

const readSample = async (db: Db, id: string) => {
  const res = await testClient(createApp(db).app).admin.samples[":id"].$get(
    { param: { id } },
    { headers: authHeader },
  );
  expect(res.status).toBe(200);
  return adminSampleResponseSchema.parse(await res.json()).data;
};

const statusesOf = async (db: Db, samples: Sample[]) => {
  const rows = await db
    .selectFrom("sample")
    .select(["id", "status"])
    .where(
      "id",
      "in",
      samples.map(({ id }) => id),
    )
    .execute();
  return samples.map(({ id }) => rows.find((row) => row.id === id)?.status);
};

const rowOf = (db: Db, id: string) =>
  db
    .selectFrom("sample")
    .select(["status", "published_at", "updated_at"])
    .where("id", "=", id)
    .executeTakeFirstOrThrow();

const caller = (db: Db) =>
  provisionUser(db, "test-token", { status: "accepted" }).then(({ id }) => id);

describe("a series of samples' children", () => {
  pgTest(
    "should answer 422 and write no series when one is created with a child",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const child = await insertCore(db, ownerId, "Carotte 1");
      const before = await db.selectFrom("sample").select("id").execute();
      // Act
      const res = await createSeries(db, [child.id]);
      // Assert
      expect({
        status: res.status,
        body: await res.json(),
        ids: await db.selectFrom("sample").select("id").execute(),
      }).toEqual({ status: 422, body: CHILDREN_NEED_PUBLICATION, ids: before });
    },
  );

  pgTest(
    "should answer 422 and link nothing when a draft series is updated with a child",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const child = await insertCore(db, ownerId, "Carotte 1");
      const input = { ...draft, type: CORE_SERIES };
      const series = await insertOwned(db, ownerId, input, false);
      // Act
      const res = await putSample(db, series, {
        ...input,
        childIds: [child.id],
      });
      // Assert
      expect({
        status: res.status,
        body: await res.json(),
        seriesId: await seriesIdOf(db, child.id),
      }).toEqual({
        status: 422,
        body: CHILDREN_NEED_PUBLICATION,
        seriesId: null,
      });
    },
  );

  pgTest.for([
    {
      label: "a draft",
      arrange: (db: Db, ownerId: string) =>
        insertOwned(db, ownerId, { type: "core" }, false),
    },
    {
      label: "a sub-sample",
      arrange: async (db: Db, ownerId: string) => {
        const parent = await insertParent(db, ownerId);
        return insertOwned(db, ownerId, {
          type: "core",
          parentIds: [parent.id],
        });
      },
    },
    {
      label: "a series of samples",
      arrange: (db: Db, ownerId: string) =>
        insertOwned(db, ownerId, { type: CORE_SERIES }),
    },
    {
      label: "a sample the caller cannot edit",
      arrange: async (db: Db) => {
        const other = await insertUser(db, "other@example.com");
        return insertOwned(db, other.id, { type: "core" });
      },
    },
    {
      label: "a member of another series",
      arrange: async (db: Db, ownerId: string) => {
        const member = await insertCore(db, ownerId, "Carotte 1");
        await insertOwned(db, ownerId, {
          type: CORE_SERIES,
          childIds: [member.id],
        });
        return member;
      },
    },
  ])(
    "should answer 422 and link nothing when the child is $label",
    async ({ arrange }, { db }) => {
      // Arrange
      const ownerId = await caller(db);
      const child = await arrange(db, ownerId);
      const input = { ...publishableSample, type: CORE_SERIES };
      const series = await insertOwned(db, ownerId, input);
      // Act
      const res = await putSample(db, series, {
        ...input,
        childIds: [child.id],
      });
      // Assert
      expect({
        status: res.status,
        body: await res.json(),
        children: (await readSample(db, series.id)).children,
      }).toEqual({ status: 422, body: CHILD_NOT_ELIGIBLE, children: [] });
    },
  );

  pgTest(
    "should answer 422 on update and leave the child to the draft series holding it",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const child = await insertCore(db, ownerId, "Carotte 1");
      const holder = await insertOwned(
        db,
        ownerId,
        { ...draft, type: CORE_SERIES, childIds: [child.id] },
        false,
      );
      const input = { ...publishableSample, type: CORE_SERIES };
      const series = await insertOwned(db, ownerId, input);
      // Act
      const res = await putSample(db, series, {
        ...input,
        childIds: [child.id],
      });
      // Assert
      expect({
        status: res.status,
        body: await res.json(),
        seriesId: await seriesIdOf(db, child.id),
      }).toEqual({
        status: 422,
        body: CHILD_NOT_ELIGIBLE,
        seriesId: holder.id,
      });
    },
  );

  pgTest(
    "should replace the children of a published series on update, leaving every member's status alone",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const dropped = await insertCore(db, ownerId, "Carotte 1");
      const kept = await insertCore(db, ownerId, "Carotte 2");
      const added = await insertCore(db, ownerId, "Carotte 3");
      const input = { ...publishableSample, type: CORE_SERIES };
      const series = await insertOwned(db, ownerId, {
        ...input,
        childIds: [dropped.id, kept.id],
      });
      // Act
      const res = await putSample(db, series, {
        ...input,
        childIds: [kept.id, added.id],
      });
      await drainSynchronizationQueue(db, STUB_DATACITE_CONFIG, []);
      // Assert
      expect(res.status).toBe(200);
      expect({
        children: (await readSample(db, series.id)).children,
        dropped: await seriesIdOf(db, dropped.id),
        added: await seriesIdOf(db, added.id),
        statuses: await statusesOf(db, [dropped, kept, added]),
      }).toEqual({
        children: relatedOf(kept, added),
        dropped: null,
        added: series.id,
        statuses: ["published", "published", "published"],
      });
    },
  );

  pgTest(
    "should claim a child another user holds the edit lock on, without touching its row",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const other = await insertUser(db, "other@example.com");
      const child = await insertCore(db, ownerId, "Carotte 1");
      await db
        .updateTable("sample")
        .set({ updated_at: new Date("2026-01-01T00:00:00.000Z") })
        .where("id", "=", child.id)
        .execute();
      await acquireEditLock(db, child.id, other.id);
      const before = await rowOf(db, child.id);
      const input = { ...publishableSample, type: CORE_SERIES };
      const series = await insertOwned(db, ownerId, input);
      // Act
      const res = await putSample(db, series, {
        ...input,
        childIds: [child.id],
      });
      await drainSynchronizationQueue(db, STUB_DATACITE_CONFIG, []);
      // Assert
      expect({
        status: res.status,
        child: await rowOf(db, child.id),
        seriesId: await seriesIdOf(db, child.id),
      }).toEqual({ status: 200, child: before, seriesId: series.id });
    },
  );

  pgTest.for(["sub-sample", "parent"] as const)(
    "should refuse the series type on a %s, keeping its type",
    async (relative, { db }) => {
      const ownerId = await caller(db);
      const parent = await insertCore(db, ownerId, "Carotte 1");
      const subSample = await insertOwned(db, ownerId, {
        type: "core",
        parentIds: [parent.id],
        location: undefined,
      });
      const target = relative === "parent" ? parent : subSample;

      const res = await putSample(db, await readSample(db, target.id), {
        ...publishableSample,
        type: CORE_SERIES,
        ...(relative === "parent" ? {} : { location: undefined }),
      });

      expect({
        status: res.status,
        body: await res.json(),
        type: (await readSample(db, target.id)).type,
      }).toEqual({
        status: 422,
        body: { error: "A series of samples has no parent nor sub-sample" },
        type: "core",
      });
    },
  );

  pgTest("should answer 422 when a series lists itself", async ({ db }) => {
    // Arrange
    const ownerId = await caller(db);
    const input = { ...publishableSample, type: CORE_SERIES };
    const series = await insertOwned(db, ownerId, input);
    // Act
    const res = await putSample(db, series, {
      ...input,
      childIds: [series.id],
    });
    // Assert
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual(CHILD_NOT_ELIGIBLE);
  });

  pgTest(
    "should keep the current children across a sub-type change",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const child = await insertCore(db, ownerId, "Carotte 1");
      const input = {
        ...publishableSample,
        type: CORE_SERIES,
        childIds: [child.id],
      };
      const series = await insertOwned(db, ownerId, input);
      // Act
      const res = await putSample(db, series, {
        ...input,
        type: "serie_of_sample.dredge",
      });
      // Assert
      expect({
        status: res.status,
        type: (await readSample(db, series.id)).type,
        seriesId: await seriesIdOf(db, child.id),
      }).toEqual({
        status: 200,
        type: "serie_of_sample.dredge",
        seriesId: series.id,
      });
    },
  );

  pgTest.for([
    { type: CORE_SERIES, status: 422, kept: "core" },
    { type: "dredge", status: 200, kept: "dredge" },
  ])(
    "should answer $status when a member of a core series takes the type $type",
    async ({ type, status, kept }, { db }) => {
      // Arrange
      const ownerId = await caller(db);
      const created = await insertCore(db, ownerId, "Carotte 1");
      await insertOwned(db, ownerId, {
        type: CORE_SERIES,
        childIds: [created.id],
      });
      const member = await readSample(db, created.id);
      // Act
      const res = await putSample(db, member, { ...publishableSample, type });
      // Assert
      expect({
        status: res.status,
        type: (await readSample(db, member.id)).type,
      }).toEqual({ status, type: kept });
    },
  );

  pgTest(
    "should answer 422 and keep the attachments for a member taking the series type",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const member = await insertCore(db, ownerId, "Carotte 1");
      await insertOwned(db, ownerId, {
        type: CORE_SERIES,
        childIds: [member.id],
      });
      const app = createApp(db, { attachmentsDir: ATTACHMENTS_DIR }).app;
      const form = new FormData();
      form.set(
        "file",
        new File([new TextEncoder().encode("a,b\n1,2\n")], "m.csv", {
          type: "text/csv",
        }),
      );
      const uploaded = await app.request(
        `/admin/samples/${member.id}/attachments`,
        { method: "POST", headers: authHeader, body: form },
      );
      expect(uploaded.status).toBe(201);
      const current = await readSample(db, member.id);
      // Act
      const res = await testClient(app).admin.samples[":id"].$put(
        {
          param: { id: member.id },
          json: {
            ...publishableSample,
            type: CORE_SERIES,
            attachments: [],
            expectedUpdatedAt: current.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect({
        status: res.status,
        attachments: (await readSample(db, member.id)).attachments.map(
          ({ name }) => name,
        ),
      }).toEqual({ status: 422, attachments: ["m.csv"] });
    },
  );

  pgTest.for([
    {
      label: "a super admin",
      arrange: (db: Db) =>
        provisionUser(db, "test-token", {
          status: "accepted",
          superAdmin: true,
        }).then(({ id }) => id),
    },
    {
      label: "a manager of the sample's laboratory",
      arrange: async (db: Db) => {
        const id = await caller(db);
        await moderateInstitution(db, id, {
          kind: "laboratory",
          code: MANAGED_LABORATORY,
        });
        return id;
      },
    },
  ])(
    "should let $label add a sample of another user",
    async ({ arrange }, { db }) => {
      // Arrange
      const callerId = await arrange(db);
      const other = await insertUser(db, "other@example.com");
      const inserted = await insertSample(
        db,
        { ...publishableSample, type: "core", name: "Carotte 1" },
        {
          institutionalOrganization: null,
          institutionalOsu: null,
          institutionalLaboratory: MANAGED_LABORATORY,
        },
      );
      await insertSampleOwner(db, inserted.id, other.id);
      const child = (await publishSample(db, inserted.id))!;
      const input = { ...publishableSample, type: CORE_SERIES };
      const series = await insertOwned(db, callerId, input);
      // Act
      const res = await putSample(db, series, {
        ...input,
        childIds: [child.id],
      });
      // Assert
      expect({
        status: res.status,
        children: (await readSample(db, series.id)).children,
      }).toEqual({ status: 200, children: relatedOf(child) });
    },
  );
});

describe("a series at DataCite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DATACITE_API_HOST;
  });

  const publishedSeries = async (
    db: Db,
    ownerId: string,
    childIds: string[],
  ) => {
    const input = { ...publishableSample, type: CORE_SERIES };
    const series = await insertOwned(db, ownerId, { ...input, childIds });
    await registerDois(db, [series.id, ...childIds]);
    return { series, input };
  };

  pgTest(
    "should send the series' HasPart alone once the queue drains, leaving its members' DOIs and statuses alone",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 200 }));
      const ownerId = await caller(db);
      const dropped = await insertCore(db, ownerId, "Carotte 1");
      const kept = await insertCore(db, ownerId, "Carotte 2");
      const added = await insertCore(db, ownerId, "Carotte 3");
      const { series, input } = await publishedSeries(db, ownerId, [
        dropped.id,
        kept.id,
      ]);
      await registerDois(db, [added.id]);
      // Act
      const res = await putSample(db, series, {
        ...input,
        childIds: [kept.id, added.id],
      });
      await drainSynchronizationQueue(db, STUB_DATACITE_CONFIG, []);
      // Assert
      expect({
        status: res.status,
        puts: hasPartPutsOf(fetchMock),
        statuses: await statusesOf(db, [dropped, kept, added]),
      }).toEqual({
        status: 200,
        puts: [
          { url: doiUrlOf(series.igsn), hasPart: [kept.igsn, added.igsn] },
        ],
        statuses: ["published", "published", "published"],
      });
    },
  );

  pgTest.for(["withdrawn", "embargo"] as const)(
    "should claim a %s child without touching its row or its DOI, even once the queue drains",
    async (status, { db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 200 }));
      const ownerId = await caller(db);
      const created = await insertOwned(
        db,
        ownerId,
        { type: "core", name: "Carotte 1" },
        false,
      );
      const child = (await publishSample(
        db,
        created.id,
        status,
        null,
        status === "embargo" ? "2099-01-01T00:00:00.000Z" : undefined,
      ))!;
      const { series, input } = await publishedSeries(db, ownerId, []);
      await registerDois(db, [child.id]);
      const before = await rowOf(db, child.id);
      // Act
      const res = await putSample(db, series, {
        ...input,
        childIds: [child.id],
      });
      await drainSynchronizationQueue(db, STUB_DATACITE_CONFIG, []);
      // Assert
      expect({
        status: res.status,
        child: await rowOf(db, child.id),
        puts: hasPartPutsOf(fetchMock),
      }).toEqual({
        status: 200,
        child: before,
        puts: [{ url: doiUrlOf(series.igsn), hasPart: [child.igsn] }],
      });
    },
  );
});
