import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { adminSampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { afterEach, describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertOwned } from "../tests/insert-owned.ts";
import { insertParent } from "../tests/insert-parent.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { seriesIdOf } from "../tests/series-id-of.ts";
import {
  doiUrlOf,
  registerDois,
  relationPutsOf,
  STUB_DATACITE_CONFIG,
  stubDataCite,
} from "../tests/stub-datacite.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";
import { drainSynchronizationQueue } from "./service/synchronization-worker.ts";

type Db = Kysely<DB>;

const authHeader = { Authorization: "Bearer test-token" };

const SERIES_NOT_ELIGIBLE = { error: "Series not eligible" };

const CORE_SERIES = "serie_of_sample.core";

const MANAGED_LABORATORY = "UMR7358";

const MEMBER = { ...publishableSample, type: "core", name: "Carotte 1" };

const insertCore = (db: Db, ownerId: string) =>
  insertOwned(db, ownerId, MEMBER);

const insertSeries = (
  db: Db,
  ownerId: string,
  input: Partial<CreateSample> = {},
  published = true,
) =>
  insertOwned(
    db,
    ownerId,
    { name: "Core series", type: CORE_SERIES, ...input },
    published,
  );

const putSample = (db: Db, sample: Sample, body: CreateSample) =>
  testClient(createApp(db).app).admin.samples[":id"].$put(
    {
      param: { id: sample.id },
      json: { ...body, expectedUpdatedAt: sample.updatedAt },
    },
    { headers: authHeader },
  );

const joinSeries = (db: Db, member: Sample, seriesId: string | null) =>
  putSample(db, member, { ...MEMBER, seriesId });

const readSample = async (db: Db, id: string) => {
  const res = await testClient(createApp(db).app).admin.samples[":id"].$get(
    { param: { id } },
    { headers: authHeader },
  );
  expect(res.status).toBe(200);
  return adminSampleResponseSchema.parse(await res.json()).data;
};

const caller = (db: Db) =>
  provisionUser(db, "test-token", { status: "accepted" }).then(({ id }) => id);

const insertInManagedLaboratory = async (db: Db, input: CreateSample) => {
  const other = await insertUser(db, "other@example.com");
  const inserted = await insertSample(db, input, {
    institutionalOrganization: null,
    institutionalOsu: null,
    institutionalLaboratory: MANAGED_LABORATORY,
  });
  await insertSampleOwner(db, inserted.id, other.id);
  return (await publishSample(db, inserted.id))!;
};

describe("a sample picking its series", () => {
  pgTest("should join the series it names", async ({ db }) => {
    // Arrange
    const ownerId = await caller(db);
    const member = await insertCore(db, ownerId);
    const series = await insertSeries(db, ownerId);
    // Act
    const res = await joinSeries(db, member, series.id);
    // Assert
    expect({
      status: res.status,
      seriesId: await seriesIdOf(db, member.id),
    }).toEqual({ status: 200, seriesId: series.id });
  });

  pgTest.for([
    { label: "move to another series", target: "other" },
    { label: "leave its series", target: null },
  ] as const)("should $label", async ({ target }, { db }) => {
    // Arrange
    const ownerId = await caller(db);
    const member = await insertCore(db, ownerId);
    await insertSeries(db, ownerId, { childIds: [member.id] });
    const other = await insertSeries(db, ownerId, { name: "Other series" });
    const seriesId = target === null ? null : other.id;
    // Act
    const res = await joinSeries(db, await readSample(db, member.id), seriesId);
    // Assert
    expect({
      status: res.status,
      seriesId: await seriesIdOf(db, member.id),
    }).toEqual({ status: 200, seriesId });
  });

  pgTest.for([
    { label: "joins a series while gaining a parent", isMember: false },
    { label: "gains a parent while in a series", isMember: true },
  ])(
    "should answer 400 and change nothing when a sample $label",
    async ({ isMember }, { db }) => {
      // Arrange
      const ownerId = await caller(db);
      const parent = await insertParent(db, ownerId);
      const member = await insertCore(db, ownerId);
      const series = await insertSeries(db, ownerId, {
        childIds: isMember ? [member.id] : [],
      });
      // Act
      const res = await putSample(db, await readSample(db, member.id), {
        ...MEMBER,
        location: undefined,
        parentIds: [parent.id],
        seriesId: series.id,
      });
      // Assert
      expect({
        status: res.status,
        seriesId: await seriesIdOf(db, member.id),
        parents: (await readSample(db, member.id)).parents,
      }).toEqual({
        status: 400,
        seriesId: isMember ? series.id : null,
        parents: [],
      });
    },
  );

  pgTest(
    "should save a member naming the series it already belongs to, though the caller cannot edit that series",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const other = await insertUser(db, "other@example.com");
      const member = await insertCore(db, ownerId);
      const series = await insertSeries(db, other.id, {
        childIds: [member.id],
      });
      // Act
      const res = await joinSeries(
        db,
        await readSample(db, member.id),
        series.id,
      );
      // Assert
      expect({
        status: res.status,
        seriesId: await seriesIdOf(db, member.id),
      }).toEqual({ status: 200, seriesId: series.id });
    },
  );

  pgTest.for([
    {
      label: "the sample is a draft",
      arrange: async (db: Db, ownerId: string) => ({
        member: await insertOwned(db, ownerId, MEMBER, false),
        series: await insertSeries(db, ownerId),
      }),
    },
    {
      label: "the sample is a sub-sample",
      arrange: async (db: Db, ownerId: string) => {
        const parent = await insertParent(db, ownerId);
        return {
          member: await insertOwned(db, ownerId, {
            ...MEMBER,
            parentIds: [parent.id],
            location: undefined,
          }),
          series: await insertSeries(db, ownerId),
        };
      },
    },
    {
      label: "the caller cannot edit the series",
      arrange: async (db: Db, ownerId: string) => {
        const other = await insertUser(db, "other@example.com");
        return {
          member: await insertCore(db, ownerId),
          series: await insertSeries(db, other.id),
        };
      },
    },
    {
      label: "the series is a draft",
      arrange: async (db: Db, ownerId: string) => ({
        member: await insertCore(db, ownerId),
        series: await insertSeries(db, ownerId, {}, false),
      }),
    },
    {
      label: "the target is not a series",
      arrange: async (db: Db, ownerId: string) => ({
        member: await insertCore(db, ownerId),
        series: await insertOwned(db, ownerId, { type: "dredge" }),
      }),
    },
  ])(
    "should answer 422 and join nothing when $label",
    async ({ arrange }, { db }) => {
      // Arrange
      const ownerId = await caller(db);
      const { member, series } = await arrange(db, ownerId);
      // Act
      const res = await putSample(db, member, {
        ...MEMBER,
        location: member.parents.length > 0 ? undefined : MEMBER.location,
        seriesId: series.id,
      });
      // Assert
      expect({
        status: res.status,
        body: await res.json(),
        seriesId: await seriesIdOf(db, member.id),
      }).toEqual({ status: 422, body: SERIES_NOT_ELIGIBLE, seriesId: null });
    },
  );

  pgTest(
    "should answer 422 and create nothing when a sample is created in a series",
    async ({ db }) => {
      // Arrange
      const ownerId = await caller(db);
      const series = await insertSeries(db, ownerId);
      const before = await db.selectFrom("sample").select("id").execute();
      // Act
      const res = await testClient(createApp(db).app).admin.samples.$post(
        { json: { ...MEMBER, seriesId: series.id } },
        { headers: authHeader },
      );
      // Assert
      expect({
        status: res.status,
        body: await res.json(),
        ids: await db.selectFrom("sample").select("id").execute(),
      }).toEqual({
        status: 422,
        body: { error: "A sample joins a series once published" },
        ids: before,
      });
    },
  );

  pgTest("should answer 400 when a series names a series", async ({ db }) => {
    // Arrange
    const ownerId = await caller(db);
    const series = await insertSeries(db, ownerId);
    const other = await insertSeries(db, ownerId, { name: "Other series" });
    // Act
    const res = await putSample(db, series, {
      ...publishableSample,
      type: CORE_SERIES,
      seriesId: other.id,
    });
    // Assert
    expect({
      status: res.status,
      seriesId: await seriesIdOf(db, series.id),
    }).toEqual({ status: 400, seriesId: null });
  });

  pgTest("should expose the series it belongs to", async ({ db }) => {
    // Arrange
    const ownerId = await caller(db);
    const member = await insertCore(db, ownerId);
    const series = await insertSeries(db, ownerId, { childIds: [member.id] });
    // Act
    const read = await readSample(db, member.id);
    // Assert
    expect(read.series).toEqual({
      id: series.id,
      igsn: series.igsn,
      name: series.name,
      material: series.material,
    });
  });

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
      label: "a manager of the series' laboratory",
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
    "should let $label join another user's series",
    async ({ arrange }, { db }) => {
      // Arrange
      const callerId = await arrange(db);
      const member = await insertCore(db, callerId);
      const series = await insertInManagedLaboratory(db, {
        ...publishableSample,
        type: CORE_SERIES,
      });
      // Act
      const res = await joinSeries(db, member, series.id);
      // Assert
      expect({
        status: res.status,
        seriesId: await seriesIdOf(db, member.id),
      }).toEqual({ status: 200, seriesId: series.id });
    },
  );
});

describe("a series member at DataCite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DATACITE_API_HOST;
  });

  pgTest(
    "should send the member's IsPartOf alone, leaving the series' DOI alone",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 200 }));
      const ownerId = await caller(db);
      const member = await insertCore(db, ownerId);
      const series = await insertSeries(db, ownerId);
      await registerDois(db, [member.id, series.id]);
      // Act
      const res = await joinSeries(db, member, series.id);
      await drainSynchronizationQueue(db, STUB_DATACITE_CONFIG, []);
      // Assert
      expect({
        status: res.status,
        puts: relationPutsOf(fetchMock, "IsPartOf"),
      }).toEqual({
        status: 200,
        puts: [{ url: doiUrlOf(member.igsn), related: [series.igsn] }],
      });
    },
  );
});
