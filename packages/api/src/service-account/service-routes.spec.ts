import type { CoreSample } from "@projet-igsn/domain/sample/core/core-sample-schema";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { ageSchema } from "@projet-igsn/domain/sample/age/model";
import { toConcept } from "@projet-igsn/domain/sample/core/concept";
import {
  parentIgsnOf,
  toParentIdentifierType,
} from "@projet-igsn/domain/sample/core/core-relation-schema";
import {
  COLLECTION_SPECIMEN,
  SYNTHETIC_SAMPLE,
} from "@projet-igsn/domain/sample/core/core-sample-fixture";
import { coreSampleSchema } from "@projet-igsn/domain/sample/core/core-sample-schema";
import { SUB_SAMPLE } from "@projet-igsn/domain/sample/core/core-sample-variant-fixture";
import { toCoreSample } from "@projet-igsn/domain/sample/core/to-core-sample";
import {
  DATACITE_MEDIA_TYPE,
  dataCiteSampleSchema,
} from "@projet-igsn/domain/sample/datacite/datacite-schema";
import { toDataCiteSample } from "@projet-igsn/domain/sample/datacite/to-datacite-sample";
import {
  ISAMPLES_MEDIA_TYPE,
  iSamplesSampleSchema,
} from "@projet-igsn/domain/sample/isamples/isamples-schema";
import { toISamplesSample } from "@projet-igsn/domain/sample/isamples/to-isamples-sample";
import {
  OMS_MEDIA_TYPE,
  omsSampleCollectionSchema,
  omsSampleSchema,
} from "@projet-igsn/domain/sample/oms/oms-schema";
import {
  toOmsSample,
  toOmsSampleCollection,
} from "@projet-igsn/domain/sample/oms/to-oms-sample";
import {
  coreListSamplesResponseSchema,
  dataCiteListSamplesResponseSchema,
  frozenServiceSampleSchema,
  iSamplesListSamplesResponseSchema,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import { describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { setSampleStatus } from "../sample/service/set-sample-status.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { readSample } from "../tests/read-sample.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { hashApiKey } from "./api-key.ts";

const KEY = "9tPqk1n0RmWvJ8LxUeYb3sQaZc7Hd2Fg";

const FRONTEND_URL = "http://localhost:3000/";

const ADMIN_URL = "http://localhost:3001/admin/";

const IN_REACH = "UMR7358";
const OUT_OF_REACH = "UMR5275";
const FOREIGN_GROUP_ID = "01890a5d-ac96-774b-bcce-b302099a9003";
const FOREIGN_GROUP_NAME = "Alpine Campaign 2026";

const OWNER = { firstname: "Jean", name: "Martin" };

const core = (sample: Sample) => toCoreSample(sample, FRONTEND_URL);

const storedCore = async (db: Kysely<DB>, id: string) =>
  core((await readSample(db, id))!);

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

async function arrangeAccount(db: Kysely<DB>) {
  const owner = await insertUser(db, "jean.martin@univ-lorraine.fr", OWNER);
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
  return (await publishSample(db, parent.id))!;
};

const serviceRequest = (
  app: ReturnType<typeof createApp>["app"],
  method: "GET" | "POST" | "PUT",
  path: string,
  input?: unknown,
  accept?: string,
) =>
  app.request(`/service/samples${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(accept === undefined ? {} : { Accept: accept }),
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

const getSample = (
  app: ReturnType<typeof createApp>["app"],
  igsn: string,
  accept?: string,
) => serviceRequest(app, "GET", `/${igsn}`, undefined, accept);

const listSamples = (
  app: ReturnType<typeof createApp>["app"],
  params: Record<string, string> = {},
  accept?: string,
) =>
  serviceRequest(
    app,
    "GET",
    `?${new URLSearchParams({ page: "1", perPage: "10", ...params }).toString()}`,
    undefined,
    accept,
  );

const fieldSample = {
  ...publishableSample,
  scientificContext: {
    provenanceStatus: "field_sample" as const,
    collectorFirstname: "Georges",
    collectorLastname: "Cuvier",
  },
} satisfies CreateSample;

const NEW_BODY = core(COLLECTION_SPECIMEN);

const parentRelation = (igsn: string) => ({
  relationType: "IsDerivedFrom",
  targetIdentifier: {
    value: igsn,
    identifierType: toParentIdentifierType(igsn),
  },
  targetTitles: [{ value: "Parent block", titleType: "Main" }],
  targetResourceType: "PhysicalObject",
});

const subSampleBody = (...igsns: string[]) => {
  const { location: _inherited, ...production } = NEW_BODY.production;
  return { ...NEW_BODY, production, relations: igsns.map(parentRelation) };
};

const PROCESS_STEPS = core(SUB_SAMPLE).production.processSteps?.filter(
  (step) => step.timestampStart != null,
);

const PROCESS_STEPS_ON_ROOT = {
  error: "Invalid sample",
  issues: [
    {
      path: "production.processSteps",
      code: "custom",
      message: expect.any(String),
    },
  ],
};

const SYNTHETIC_BODY = core(SYNTHETIC_SAMPLE);

const syntheticSubSampleBody = (...igsns: string[]) => ({
  ...SYNTHETIC_BODY,
  relations: igsns.map(parentRelation),
});

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
      expect(coreListSamplesResponseSchema.parse(await res.json())).toEqual({
        data: published.map((sample) => core(sample!)),
        meta: { total: 2 },
      });
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
      expect(coreListSamplesResponseSchema.parse(await res.json())).toEqual({
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
      expect(coreListSamplesResponseSchema.parse(await res.json())).toEqual({
        data: [core(published!)],
        meta: { total: 1 },
      });
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
          { ...publishableSample, name: `Sample ${index}` },
          IN_REACH,
        );
        await publishSample(db, sample.id);
      }
      // Act
      const res = await listSamples(app, { page: "2" });
      // Assert
      const body = coreListSamplesResponseSchema.parse(await res.json());
      expect(body.data).toHaveLength(1);
      expect(body.meta.total).toBe(11);
    },
  );

  pgTest("should list samples in ascending igsn order", async ({ db }) => {
    // Arrange
    const { app } = await arrangeAccount(db);
    const igsns = ["C".repeat(26), "A".repeat(26), "B".repeat(26)];
    for (const igsn of igsns) {
      const sample = await inLaboratory(
        db,
        { ...publishableSample, name: igsn },
        IN_REACH,
      );
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
    const body = coreListSamplesResponseSchema.parse(await res.json());
    expect(
      body.data.map((sample) => sample.identification.sampleIdentifier),
    ).toEqual([...igsns].sort());
  });

  pgTest("should ignore a status sent by the caller", async ({ db }) => {
    // Arrange
    const { app } = await arrangeAccount(db);
    const published = await inLaboratory(db, publishableSample, IN_REACH);
    await publishSample(db, published.id);
    await inLaboratory(db, publishableSample, IN_REACH);
    // Act
    const res = await listSamples(app, { status: "draft" });
    // Assert
    const body = coreListSamplesResponseSchema.parse(await res.json());
    expect(body.data.map((sample) => sample.record.recordId)).toEqual([
      `urn:uuid:${published.id}`,
    ]);
    expect(body.meta.total).toBe(1);
  });

  pgTest.for([
    {
      rule: "the nature vocabulary",
      param: "natureOfSample",
      value: "rock_powder",
      matching: { nature: "rock_powder" as const },
      other: { nature: "thin_section" as const },
    },
    {
      rule: "an ancestor material path, keeping its whole subtree",
      param: "materialCategory",
      value: "rock_and_sediment.sediment",
      matching: {
        material: "rock_and_sediment.sediment.exogenous_detritic.clay",
      },
      other: { material: "rock_and_sediment.rock.igneous" },
    },
    {
      rule: "the collector full name in either order",
      param: "collector",
      value: "cuvier georges",
      matching: { scientificContext: fieldSample.scientificContext },
      other: {
        scientificContext: {
          ...fieldSample.scientificContext,
          collectorFirstname: "Alfred",
          collectorLastname: "Wegener",
        },
      },
    },
    {
      rule: "a lower bound on the numeric age",
      param: "numericAgeMin",
      value: "100",
      matching: {
        age: ageSchema.parse({
          numericAgeMin: 150,
          numericAgeMax: 200,
          numericAgeUnit: "ma",
        }),
      },
      other: {
        age: ageSchema.parse({
          numericAgeMin: 1,
          numericAgeMax: 2,
          numericAgeUnit: "ma",
        }),
      },
    },
    {
      rule: "a manual group of the sample",
      param: "manualGroup",
      value: FOREIGN_GROUP_ID,
      matching: { manualGroupIds: [FOREIGN_GROUP_ID] },
      other: { manualGroupIds: [] },
    },
    {
      rule: "a free-text search",
      param: "search",
      value: "gres",
      matching: { name: "Grès de Fontainebleau" },
      other: { name: "Basalte du Massif Central" },
    },
    {
      rule: "a bounding box",
      param: "bbox",
      value: "2,44,4,46",
      matching: {
        location: {
          position: { type: "point" as const, longitude: 3, latitude: 45 },
        },
      },
      other: {
        location: {
          position: { type: "point" as const, longitude: -60, latitude: 10 },
        },
      },
    },
  ])(
    "should keep only the samples matching $rule",
    async ({ param, value, matching, other }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      await db
        .insertInto("manual_group")
        .values({ id: FOREIGN_GROUP_ID, name: FOREIGN_GROUP_NAME })
        .execute();
      const kept = await inLaboratory(
        db,
        { ...publishableSample, ...matching },
        IN_REACH,
      );
      const dropped = await inLaboratory(
        db,
        { ...publishableSample, ...other },
        IN_REACH,
      );
      await publishSample(db, kept.id);
      await publishSample(db, dropped.id);
      // Act
      const res = await listSamples(app, { [param]: value });
      // Assert
      expect(res.status).toBe(200);
      const body = coreListSamplesResponseSchema.parse(await res.json());
      expect(body.data.map((sample) => sample.record.recordId)).toEqual([
        `urn:uuid:${kept.id}`,
      ]);
    },
  );

  pgTest("should count only the filtered samples", async ({ db }) => {
    // Arrange
    const { app } = await arrangeAccount(db);
    for (const nature of [
      "rock_powder",
      "rock_powder",
      "thin_section",
    ] as const) {
      const sample = await inLaboratory(
        db,
        { ...publishableSample, nature },
        IN_REACH,
      );
      await publishSample(db, sample.id);
    }
    // Act
    const res = await listSamples(app, { natureOfSample: "rock_powder" });
    // Assert
    const body = coreListSamplesResponseSchema.parse(await res.json());
    expect(body.meta.total).toBe(2);
  });

  pgTest(
    "should answer 400 for a filter value outside its vocabulary",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await listSamples(app, { natureOfSample: "lava" });
      // Assert
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid query parameters" });
    },
  );
});

describe("GET /service/samples/:igsn", () => {
  pgTest.for([
    { reach: "inside", laboratory: IN_REACH },
    { reach: "outside", laboratory: OUT_OF_REACH },
  ])(
    "should answer the Core record of a published sample $reach the account's reach",
    async ({ laboratory }, { db }) => {
      // Arrange
      const { app, owner } = await arrangeAccount(db);
      const sample = await inLaboratory(db, archivedSample, laboratory);
      await insertSampleOwner(db, sample.id, owner.id);
      const published = (await publishSample(db, sample.id))!;
      // Act
      const res = await getSample(app, published.igsn!);
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(await storedCore(db, sample.id));
    },
  );

  pgTest.for([
    { rule: "an IGSN matching no sample", igsnOf: async () => "A".repeat(26) },
    {
      rule: "a withdrawn sample's IGSN",
      igsnOf: async (db: Kysely<DB>) => {
        const sample = await inLaboratory(db, publishableSample, IN_REACH);
        const published = (await publishSample(db, sample.id))!;
        await setSampleStatus(db, sample.id, "withdrawn");
        return published.igsn!;
      },
    },
  ])("should answer 404 for $rule", async ({ igsnOf }, { db }) => {
    // Arrange
    const { app } = await arrangeAccount(db);
    const igsn = await igsnOf(db);
    // Act
    const res = await getSample(app, igsn);
    // Assert
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});

describe("the Accept header of the /service GET routes", () => {
  const envelope = (records: unknown[]) => ({
    data: records,
    meta: { total: records.length },
  });

  const VENDOR_FORMATS = [
    {
      format: "DataCite",
      mediaType: DATACITE_MEDIA_TYPE,
      map: toDataCiteSample,
      schema: dataCiteSampleSchema,
      listSchema: dataCiteListSamplesResponseSchema,
      listOf: (cores: CoreSample[]) => envelope(cores.map(toDataCiteSample)),
    },
    {
      format: "iSamples",
      mediaType: ISAMPLES_MEDIA_TYPE,
      map: toISamplesSample,
      schema: iSamplesSampleSchema,
      listSchema: iSamplesListSamplesResponseSchema,
      listOf: (cores: CoreSample[]) => envelope(cores.map(toISamplesSample)),
    },
    {
      format: "OMS",
      mediaType: OMS_MEDIA_TYPE,
      map: toOmsSample,
      schema: omsSampleSchema,
      listSchema: omsSampleCollectionSchema,
      listOf: (cores: CoreSample[]) =>
        toOmsSampleCollection(cores, cores.length),
    },
  ];

  pgTest.for(VENDOR_FORMATS)(
    "should answer the list as $format records under the $format media type",
    async ({ mediaType, listSchema, listOf }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const sample = await inLaboratory(db, archivedSample, IN_REACH);
      const published = (await publishSample(db, sample.id))!;
      // Act
      const res = await listSamples(app, {}, mediaType);
      // Assert
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(mediaType);
      expect(listSchema.parse(await res.json())).toEqual(
        listOf([core(published)]),
      );
    },
  );

  pgTest.for(VENDOR_FORMATS)(
    "should answer one sample as a $format record under the $format media type",
    async ({ mediaType, map, schema }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const sample = await inLaboratory(db, archivedSample, IN_REACH);
      const published = (await publishSample(db, sample.id))!;
      // Act
      const res = await getSample(app, published.igsn!, mediaType);
      // Assert
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(mediaType);
      expect(schema.parse(await res.json())).toEqual(
        map(await storedCore(db, sample.id)),
      );
    },
  );

  pgTest.for([
    {
      rule: "its DOI when the sample carries a prefix",
      prefix: "10.5072",
      doi: (igsn: string) => `10.5072/${igsn}`,
    },
    {
      rule: "its bare IGSN when it carries none",
      prefix: null,
      doi: (igsn: string) => igsn,
    },
  ])(
    "should identify the DataCite record by $rule",
    async ({ prefix, doi }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const sample = await inLaboratory(db, archivedSample, IN_REACH);
      const published = (await publishSample(db, sample.id))!;
      await db
        .updateTable("sample")
        .set({ doi_prefix: prefix })
        .where("id", "=", sample.id)
        .execute();
      // Act
      const res = await getSample(app, published.igsn!, DATACITE_MEDIA_TYPE);
      // Assert
      expect(res.status).toBe(200);
      expect(dataCiteSampleSchema.parse(await res.json())).toMatchObject({
        doi: doi(published.igsn!),
      });
    },
  );

  pgTest.for([
    {
      route: "the list",
      request: (app: ReturnType<typeof createApp>["app"]) =>
        listSamples(app, {}, "text/csv"),
    },
    {
      route: "one sample",
      request: (app: ReturnType<typeof createApp>["app"]) =>
        getSample(app, "A".repeat(26), "text/csv"),
    },
  ])(
    "should answer 406 to an Accept it does not serve on $route",
    async ({ request }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await request(app);
      // Assert
      expect(res.status).toBe(406);
      expect(await res.json()).toEqual({ error: "Not acceptable" });
    },
  );

  pgTest.for([
    `*/*, ${DATACITE_MEDIA_TYPE}`,
    `application/*, ${DATACITE_MEDIA_TYPE}`,
    `text/plain, */*, ${DATACITE_MEDIA_TYPE}`,
  ])(
    "should serve the record named beside a wildcard in Accept %s",
    async (accept, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const sample = await inLaboratory(db, archivedSample, IN_REACH);
      await publishSample(db, sample.id);
      // Act
      const res = await listSamples(app, {}, accept);
      // Assert
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(DATACITE_MEDIA_TYPE);
    },
  );

  pgTest.for([undefined, "application/json", "application/*", "*/*"])(
    "should answer Core records as application/json for Accept %s",
    async (accept, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const sample = await inLaboratory(db, archivedSample, IN_REACH);
      const published = (await publishSample(db, sample.id))!;
      // Act
      const res = await listSamples(app, {}, accept);
      // Assert
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(coreListSamplesResponseSchema.parse(await res.json())).toEqual({
        data: [core(published)],
        meta: { total: 1 },
      });
    },
  );
});

const createdId = (body: CoreSample) =>
  body.record.recordId.replace("urn:uuid:", "");

describe("POST /service/samples", () => {
  pgTest(
    "should refuse process steps on a sample with no parent relation",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await postSample(app, {
        ...NEW_BODY,
        production: { ...NEW_BODY.production, processSteps: PROCESS_STEPS },
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual(PROCESS_STEPS_ON_ROOT);
    },
  );

  pgTest(
    "should publish the sample at once, owned by the account's owner and snapshotting the account's institutional trio",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeAccount(db);
      // Act
      const res = await postSample(app, NEW_BODY);
      // Assert
      expect(res.status).toBe(201);
      const body = coreSampleSchema.parse(await res.json());
      const id = createdId(body);
      expect(body).toEqual(await storedCore(db, id));
      expect(body.identification.sampleIdentifier).toBe(generateIgsnSuffix(id));
      expect(
        await db
          .selectFrom("sample")
          .select([
            "status",
            "institutional_organization",
            "institutional_osu",
            "institutional_laboratory",
          ])
          .executeTakeFirstOrThrow(),
      ).toEqual({
        status: "published",
        institutional_organization: "04vfs2w97",
        institutional_osu: "OTELo",
        institutional_laboratory: IN_REACH,
      });
      expect(
        await db
          .selectFrom("user_sample")
          .select(["user_id", "role"])
          .where("sample_id", "=", id)
          .execute(),
      ).toEqual([{ user_id: owner.id, role: "owner" }]);
    },
  );

  pgTest(
    "should list every publication blocker at its Core path and write no sample when the body is incomplete",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      await db
        .insertInto("manual_group")
        .values({ id: FOREIGN_GROUP_ID, name: FOREIGN_GROUP_NAME })
        .execute();
      // Act
      const res = await postSample(app, {
        ...NEW_BODY,
        classification: {
          ...NEW_BODY.classification,
          sampleObjectTypes: [toConcept("sample-type", "core")],
        },
        responsibility: NEW_BODY.responsibility.filter(
          (agentRole) => agentRole.roles[0] !== "Curator",
        ),
        manualGroups: [{ id: FOREIGN_GROUP_ID, name: FOREIGN_GROUP_NAME }],
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          {
            path: "classification.sampleObjectTypes.0",
            code: "type_incomplete",
          },
          {
            path: "responsibility",
            code: "collection_curator_firstname_missing",
          },
          {
            path: "responsibility",
            code: "collection_curator_lastname_missing",
          },
          { path: "manualGroups.0.id", code: "manual_group_not_attachable" },
        ],
      });
      expect(await db.selectFrom("sample").selectAll().execute()).toEqual([]);
    },
  );

  pgTest.for([
    {
      rule: "an unknown vocabulary value",
      body: {
        ...NEW_BODY,
        classification: {
          ...NEW_BODY.classification,
          natureOfSample: {
            ...NEW_BODY.classification.natureOfSample,
            id: "pebble",
          },
        },
      },
      issues: [
        {
          path: "classification.natureOfSample.id",
          code: "invalid_value",
          message: expect.any(String),
        },
      ],
    },
    {
      rule: "attachments",
      body: { ...NEW_BODY, attachments: [] },
      issues: [{ code: "unrecognized_keys", message: expect.any(String) }],
    },
  ])(
    "should name the offending field when the body carries $rule",
    async ({ body, issues }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await postSample(app, body);
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: "Invalid sample", issues });
    },
  );

  pgTest(
    "should report a domain rule the Core schema cannot express at its Core path",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await postSample(app, {
        ...NEW_BODY,
        classification: {
          ...NEW_BODY.classification,
          contextCategories: [
            ...NEW_BODY.classification.contextCategories,
            toConcept("texture", "phaneritic"),
          ],
        },
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          {
            path: "classification.contextCategories",
            code: "custom",
            message: expect.any(String),
          },
        ],
      });
    },
  );

  pgTest.for([
    {
      rule: "an IGSN matching no sample",
      igsnOf: async () => "ABCDEFGHJKMNPQRSTVWXYZ0123",
    },
    {
      rule: "a draft sample's IGSN",
      igsnOf: async (db: Kysely<DB>) =>
        generateIgsnSuffix(
          (await inLaboratory(db, publishableSample, IN_REACH)).id,
        ),
    },
    {
      rule: "a withdrawn sample's IGSN",
      igsnOf: async (db: Kysely<DB>) => {
        const parent = await inLaboratory(db, publishableSample, IN_REACH);
        const published = (await publishSample(db, parent.id))!;
        await setSampleStatus(db, parent.id, "withdrawn");
        return published.igsn!;
      },
    },
  ])(
    "should report a parent relation that does not resolve, $rule",
    async ({ igsnOf }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const igsn = await igsnOf(db);
      // Act
      const res = await postSample(app, subSampleBody(igsn));
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          {
            path: "relations.0.targetIdentifier.value",
            code: "parent_not_found",
          },
        ],
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
        ...NEW_BODY,
        relations: [parentRelation(parent.igsn!)],
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          {
            path: "production.location",
            code: "location_inherited_from_parent",
          },
        ],
      });
    },
  );

  pgTest.for([
    { rule: "a minted IGSN", legacy: null, identifierType: "DOI" },
    { rule: "a legacy IGSN", legacy: "CNRS1234567890", identifierType: "IGSN" },
  ])(
    "should resolve the parent by $rule and publish the sub-sample with its location",
    async ({ legacy, identifierType }, { db }) => {
      // Arrange
      const { app, owner } = await arrangeAccount(db);
      const parent = await ownedParent(db, owner.id);
      if (legacy !== null) {
        await db
          .updateTable("sample")
          .set({ igsn: legacy })
          .where("id", "=", parent.id)
          .execute();
      }
      const igsn = legacy ?? parent.igsn!;
      // Act
      const res = await postSample(app, subSampleBody(igsn));
      // Assert
      expect(res.status).toBe(201);
      const body = coreSampleSchema.parse(await res.json());
      expect(body).toEqual(await storedCore(db, createdId(body)));
      expect(
        body.relations?.find(
          (relation) => relation.relationType === "IsDerivedFrom",
        )?.targetIdentifier,
      ).toEqual({ value: igsn, identifierType });
      expect(body.production.location).toEqual(
        core(parent).production.location,
      );
    },
  );

  pgTest(
    "should publish a synthetic sub-sample linked to both its parents",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeAccount(db);
      const first = await ownedParent(db, owner.id);
      const second = await ownedParent(db, owner.id);
      // Act
      const res = await postSample(
        app,
        syntheticSubSampleBody(first.igsn!, second.igsn!),
      );
      // Assert
      expect(res.status).toBe(201);
      const body = coreSampleSchema.parse(await res.json());
      expect(
        (body.relations ?? [])
          .flatMap((relation) => parentIgsnOf(relation) ?? [])
          .sort(),
      ).toEqual([first.igsn!, second.igsn!].sort());
      expect(body.production.location).toEqual(
        SYNTHETIC_BODY.production.location,
      );
    },
  );

  pgTest(
    "should name the relation of the parent that does not resolve",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeAccount(db);
      const parent = await ownedParent(db, owner.id);
      // Act
      const res = await postSample(
        app,
        syntheticSubSampleBody(parent.igsn!, "ABCDEFGHJKMNPQRSTVWXYZ0123"),
      );
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          {
            path: "relations.1.targetIdentifier.value",
            code: "parent_not_found",
          },
        ],
      });
    },
  );

  pgTest("should refuse the same parent listed twice", async ({ db }) => {
    // Arrange
    const { app, owner } = await arrangeAccount(db);
    const parent = await ownedParent(db, owner.id);
    // Act
    const res = await postSample(
      app,
      syntheticSubSampleBody(parent.igsn!, parent.igsn!),
    );
    // Assert
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: "Invalid sample",
      issues: [
        { path: "relations", code: "custom", message: expect.any(String) },
      ],
    });
  });

  pgTest(
    "should refuse two parents on a non-synthetic material",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeAccount(db);
      const first = await ownedParent(db, owner.id);
      const second = await ownedParent(db, owner.id);
      // Act
      const res = await postSample(
        app,
        subSampleBody(first.igsn!, second.igsn!),
      );
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          {
            path: "classification.contextCategories",
            code: "custom",
            message: expect.any(String),
          },
        ],
      });
    },
  );

  pgTest(
    "should mail the parent owner when the account declares a sub-sample",
    async ({ db }) => {
      // Arrange
      const sendMail = vi.fn().mockResolvedValue(undefined);
      await arrangeAccount(db);
      const colleague = await insertUser(db, "colleague@univ-lorraine.fr");
      const parent = await ownedParent(db, colleague.id);
      const app = createApp(db, {
        mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
      }).app;
      // Act
      const res = await postSample(app, subSampleBody(parent.igsn!));
      // Assert
      expect(res.status).toBe(201);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({ to: ["colleague@univ-lorraine.fr"] }),
        ),
      );
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

  pgTest.for(["/service/openapi.json", "/service/docs"])(
    "should serve %s with no Authorization header, being mounted before the api key guard",
    async (path, { db }) => {
      // Arrange
      const { app } = createApp(db);
      // Act
      const res = await app.request(path);
      // Assert
      expect(res.status).toBe(200);
    },
  );

  const SAMPLES = "/service/samples";
  const ONE_SAMPLE = `/service/samples/${"A".repeat(26)}`;
  const TEXT = { "Content-Type": "text/plain" };

  pgTest.for([
    { rule: "no Content-Type", headers: {}, method: "POST", path: SAMPLES },
    { rule: "no Content-Type", headers: {}, method: "PUT", path: ONE_SAMPLE },
    { rule: "a text/plain body", headers: TEXT, method: "POST", path: SAMPLES },
    {
      rule: "a text/plain body",
      headers: TEXT,
      method: "PUT",
      path: ONE_SAMPLE,
    },
  ] as const)(
    "should answer 415 to $method with $rule",
    async ({ headers, method, path }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      // Act
      const res = await app.request(path, {
        method,
        headers: { Authorization: `Bearer ${KEY}`, ...headers },
        body: JSON.stringify(NEW_BODY),
      });
      // Assert
      expect(res.status).toBe(415);
      expect(await res.json()).toEqual({ error: "Unsupported Media Type" });
    },
  );
});

const publishedInReach = async (
  db: Kysely<DB>,
  input: CreateSample = publishableSample,
) => (await publishSample(db, (await inLaboratory(db, input, IN_REACH)).id))!;

const storedNames = (db: Kysely<DB>) =>
  db.selectFrom("sample").select("name").execute();

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

type FrozenCase = {
  field: string;
  seed: CreateSample;
  edit: (body: CoreSample) => unknown;
  path: string;
};

const FROZEN_CASES: FrozenCase[] = [
  {
    field: "the collector name",
    seed: fieldSample,
    edit: (body) => ({
      ...body,
      responsibility: body.responsibility.map((agentRole) =>
        agentRole.roles[0] === "Collector"
          ? {
              ...agentRole,
              agent: { ...agentRole.agent, lastname: "Curie" },
            }
          : agentRole,
      ),
    }),
    path: "responsibility",
  },
  {
    field: "the manual groups",
    seed: publishableSample,
    edit: (body) => ({
      ...body,
      manualGroups: [{ id: FOREIGN_GROUP_ID, name: FOREIGN_GROUP_NAME }],
    }),
    path: "manualGroups.0",
  },
  {
    field: "the parent relation",
    seed: publishableSample,
    edit: (body) => ({
      ...body,
      relations: [parentRelation("ABCDEFGHJKMNPQRSTVWXYZ0123")],
    }),
    path: "relations.0",
  },
];

describe("PUT /service/samples/:igsn", () => {
  pgTest(
    "should refuse process steps on a published sample with no parent relation",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const created = await publishedInReach(db);
      const body = core(created);
      // Act
      const res = await putSample(app, created.igsn!, {
        ...body,
        production: { ...body.production, processSteps: PROCESS_STEPS },
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual(PROCESS_STEPS_ON_ROOT);
    },
  );

  pgTest(
    "should update an editable field of a published sample in the account's reach",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const created = await publishedInReach(db);
      // Act
      const res = await putSample(
        app,
        created.igsn!,
        renamed(created, "Basalt revisited"),
      );
      // Assert
      expect(res.status).toBe(200);
      const body = coreSampleSchema.parse(await res.json());
      expect(body).toEqual(await storedCore(db, created.id));
      expect(body.identification.titles).toEqual([
        { value: "Basalt revisited", titleType: "Main" },
      ]);
    },
  );

  pgTest(
    "should keep every person account link through an unchanged round trip",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const linked = await insertUser(db, "marie.curie@univ-lorraine.fr", {
        firstname: "Marie",
        name: "Curie",
      });
      const created = await publishedInReach(db, {
        ...publishableSample,
        scientificContext: {
          provenanceStatus: "field_sample",
          collectorUserId: linked.id,
          chiefScientistUserId: linked.id,
        },
      });
      // Act
      const res = await putSample(
        app,
        created.igsn!,
        renamed(created, "Renamed"),
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        (await readSample(db, created.id))?.scientificContext,
      ).toMatchObject({
        chiefScientistFirstname: "Marie",
        chiefScientistLastname: "Curie",
        chiefScientistUserId: linked.id,
        collectorFirstname: "Marie",
        collectorLastname: "Curie",
        collectorUserId: linked.id,
      });
    },
  );

  pgTest(
    "should replace the link with the typed name when an unfrozen person is renamed",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const linked = await insertUser(db, "marie.curie@univ-lorraine.fr", {
        firstname: "Marie",
        name: "Curie",
      });
      const created = await publishedInReach(db, {
        ...publishableSample,
        scientificContext: {
          provenanceStatus: "field_sample",
          chiefScientistUserId: linked.id,
        },
      });
      const body = renamed(created, "Renamed");
      // Act
      const res = await putSample(app, created.igsn!, {
        ...body,
        responsibility: body.responsibility.map((agentRole) =>
          agentRole.roles[0] === "ChiefScientist"
            ? {
                ...agentRole,
                agent: { ...agentRole.agent, lastname: "Noether" },
              }
            : agentRole,
        ),
      });
      // Assert
      expect(res.status).toBe(200);
      expect(
        (await readSample(db, created.id))?.scientificContext,
      ).toMatchObject({
        chiefScientistFirstname: "Marie",
        chiefScientistLastname: "Noether",
      });
      expect(
        (await readSample(db, created.id))?.scientificContext,
      ).not.toHaveProperty("chiefScientistUserId");
    },
  );

  pgTest.for(FROZEN_CASES)(
    "should refuse a body changing $field and write nothing",
    async ({ seed, edit, path }, { db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const created = await publishedInReach(db, seed);
      // Act
      const res = await putSample(
        app,
        created.igsn!,
        edit(renamed(created, "Renamed")),
      );
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
      const res = await putSample(app, igsn, NEW_BODY);
      // Assert
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ error });
    },
  );

  pgTest(
    "should refuse a body raising a new publication blocker and write nothing",
    async ({ db }) => {
      // Arrange
      const { app } = await arrangeAccount(db);
      const created = await publishedInReach(db);
      const body = renamed(created, "Renamed");
      // Act
      const res = await putSample(app, created.igsn!, {
        ...body,
        classification: {
          ...body.classification,
          sampleObjectTypes: [toConcept("sample-type", "core")],
        },
      });
      // Assert
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({
        error: "Invalid sample",
        issues: [
          {
            path: "classification.sampleObjectTypes.0",
            code: "type_incomplete",
          },
        ],
      });
      expect(await storedNames(db)).toEqual([{ name: publishableSample.name }]);
    },
  );

  pgTest(
    "should mail the owner of the sample the account edits",
    async ({ db }) => {
      // Arrange
      const sendMail = vi.fn().mockResolvedValue(undefined);
      await arrangeAccount(db);
      const colleague = await insertUser(db, "colleague@univ-lorraine.fr");
      const created = await publishedInReach(db);
      await insertSampleOwner(db, created.id, colleague.id);
      const app = createApp(db, {
        mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
      }).app;
      // Act
      const res = await putSample(
        app,
        created.igsn!,
        renamed(created, "Basalt revisited"),
      );
      // Assert
      expect(res.status).toBe(200);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({ to: ["colleague@univ-lorraine.fr"] }),
        ),
      );
    },
  );

  pgTest(
    "should mail nobody when the account edits a sample its own owner owns",
    async ({ db }) => {
      // Arrange
      const sendMail = vi.fn().mockResolvedValue(undefined);
      const { owner } = await arrangeAccount(db);
      const created = await publishedInReach(db);
      await insertSampleOwner(db, created.id, owner.id);
      const app = createApp(db, {
        mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
      }).app;
      // Act
      const res = await putSample(
        app,
        created.igsn!,
        renamed(created, "Basalt revisited"),
      );
      // Assert
      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(sendMail).not.toHaveBeenCalled();
    },
  );
});
