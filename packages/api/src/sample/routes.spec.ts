import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";

import {
  publicListSamplesResponseSchema,
  MAP_LIST_SIZE,
  PAGE_SIZES,
  sampleFacetCountsResponseSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { setSampleStatus } from "./service/set-sample-status.ts";

const LONGEST_TOKEN = "⑽.😀".repeat(8);

const MAX_PAGE_SIZE = Math.max(...PAGE_SIZES);

const authHeader = { Authorization: "Bearer test-token" };

const PUBLIC_REPOSITORY = {
  currentArchiveOsu: "OASU",
  currentArchiveLaboratory: "UMR5805",
  rightsHolder: ["03fd77x13"],
};

async function acceptedClient(db: Parameters<typeof createApp>[0]) {
  await provisionUser(db, "test-token", { status: "accepted" });
  return testClient(createApp(db).app);
}

type Client = ReturnType<
  typeof testClient<ReturnType<typeof createApp>["app"]>
>;

async function createSample(
  client: Client,
  name: string,
  specificName = `${name} 001`,
  position: { longitude: number; latitude: number } = {
    longitude: 0,
    latitude: 0,
  },
) {
  const created = await client.admin.samples.$post(
    {
      json: {
        name,
        nature: "powder",
        type: "individual_sample",
        material: "rock_and_sediment.sediment.exogenous_detritic.clay",
        specificName,
        location: { position: { type: "point", ...position } },
        description: {
          collectionDate: {
            precision: "day",
            start: "2026-01-01",
            end: "2026-01-01",
          },
        },
        existenceStatus: "exists",
        availabilityStatus: "available",
        scientificContext: {
          provenanceStatus: "collection_specimen",
          collectionOrigin: "scientific_expedition",
        },
        repository: PUBLIC_REPOSITORY,
      },
    },
    { headers: authHeader },
  );
  return sampleResponseSchema.parse(await created.json()).data;
}

async function publishSample(client: Client, id: string) {
  const res = await client.admin.samples[":id"].publish.$post(
    { param: { id } },
    { headers: authHeader },
  );
  return sampleResponseSchema.parse(await res.json()).data;
}

async function createPublishedSample(
  client: Client,
  name: string,
  specificName?: string,
) {
  const draft = await createSample(client, name, specificName);
  return publishSample(client, draft.id);
}

async function searchNames(client: Client, search: string) {
  const res = await client.samples.$get({
    query: { page: "1", perPage: "10", search },
  });
  const { data } = publicListSamplesResponseSchema.parse(await res.json());
  return data.map((sample) => sample.name);
}

describe("public sample routes", () => {
  pgTest("should list only published samples", async ({ db }) => {
    // Arrange
    const client = await acceptedClient(db);
    const draft = await createSample(client, "Grès de Fontainebleau");
    await publishSample(client, draft.id);
    await createSample(client, "Basalte du Massif Central");
    const retired = await createPublishedSample(client, "Rhyolite retirée");
    await setSampleStatus(db, retired.id, { status: "withdrawn" });
    // Act
    const res = await client.samples.$get({
      query: { page: "1", perPage: "10" },
    });
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: [{ name: "Grès de Fontainebleau", status: "published" }],
      meta: { total: 1 },
    });
  });

  pgTest(
    "should keep the synchronization fields off a listed sample",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, "Grès de Fontainebleau");
      // Act
      const res = await client.samples.$get({
        query: { page: "1", perPage: "10" },
      });
      // Assert
      const { data } = (await res.json()) as { data: object[] };
      expect(data[0]).not.toHaveProperty("synchronizationStatus");
      expect(data[0]).not.toHaveProperty("synchronizationError");
    },
  );

  pgTest("should serve a page of the map list size", async ({ db }) => {
    // Arrange
    await db
      .insertInto("sample")
      .values(
        Array.from({ length: MAX_PAGE_SIZE + 1 }, (_, index) => ({
          id: crypto.randomUUID(),
          name: `Sample ${index}`,
          igsn: `CNRS${String(index).padStart(10, "0")}`,
          material: "rock_and_sediment.sediment.exogenous_detritic.clay",
          status: "published" as const,
        })),
      )
      .execute();
    const client = testClient(createApp(db).app);
    // Act
    const res = await client.samples.$get({
      query: { page: "1", perPage: String(MAP_LIST_SIZE) },
    });
    // Assert
    const { data } = publicListSamplesResponseSchema.parse(await res.json());
    expect(data).toHaveLength(MAX_PAGE_SIZE + 1);
  });

  pgTest(
    "should count the published samples per facet value",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, "Grès de Fontainebleau");
      await createSample(client, "Basalte du Massif Central");
      // Act
      const res = await client.samples.facets.$get({
        query: { page: "1", perPage: "10" },
      });
      // Assert
      expect(res.status).toBe(200);
      const { data } = sampleFacetCountsResponseSchema.parse(await res.json());
      expect(data.nature).toEqual({ powder: 1 });
    },
  );

  pgTest.for(["GRES", "facies"])(
    "should filter published samples on %j, ignoring case and diacritics",
    async (search, { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(
        client,
        "Grès de Fontainebleau",
        "Fontainebleau facies",
      );
      await createPublishedSample(client, "Basalt", "Massif Central 001");
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names).toEqual(["Grès de Fontainebleau"]);
    },
  );

  pgTest(
    "should filter published samples by a hierarchy facet",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      const draft = await createSample(client, "Clay sample");
      await publishSample(client, draft.id);
      // Act / Assert
      const match = await client.samples.$get({
        query: {
          page: "1",
          perPage: "10",
          material: "rock_and_sediment.sediment",
        },
      });
      expect(await match.json()).toMatchObject({
        data: [{ name: "Clay sample" }],
        meta: { total: 1 },
      });
      const miss = await client.samples.$get({
        query: { page: "1", perPage: "10", material: "rock_and_sediment.rock" },
      });
      expect(await miss.json()).toMatchObject({ data: [], meta: { total: 0 } });
    },
  );

  pgTest("should filter published samples by igsn", async ({ db }) => {
    // Arrange
    const client = await acceptedClient(db);
    const draft = await createSample(client, "Sandstone");
    const published = await publishSample(client, draft.id);
    const other = await createSample(client, "Basalt");
    await publishSample(client, other.id);
    // Act
    const res = await client.samples.$get({
      query: {
        page: "1",
        perPage: "10",
        search: published.igsn!.toLowerCase(),
      },
    });
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: [{ igsn: published.igsn }],
      meta: { total: 1 },
    });
  });

  pgTest("should not match a partial or wildcarded igsn", async ({ db }) => {
    const client = await acceptedClient(db);
    const published = await createPublishedSample(client, "Sandstone");
    const igsn = published.igsn!;

    const partial = await searchNames(client, igsn.slice(0, 10));
    const wildcard = await searchNames(client, `${igsn.slice(0, 10)}*`);
    const trailing = await searchNames(client, `${igsn}*`);

    expect({ partial, wildcard, trailing }).toEqual({
      partial: [],
      wildcard: [],
      trailing: [],
    });
  });

  pgTest.for(["granite", "granite core"])(
    "should return an empty list when %j matches nothing",
    async (search, { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, "Basalt Core");
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names).toEqual([]);
    },
  );

  pgTest.for([
    ["%%", "Recovery %% core"],
    ["\\\\", "Path\\\\core"],
    ["((", "Core ((deep))"],
    ["..", "Core..A"],
    ["||", "Core||A"],
    ["（（", "Core（（deep））"],
    ["©©", "Core ©© 2026"],
  ] as const)(
    "should treat the pattern character %j literally",
    async ([character, matching], { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, matching);
      await createPublishedSample(client, "Sandstone");
      // Act
      const names = await searchNames(client, character);
      // Assert
      expect(names).toEqual([matching]);
    },
  );

  pgTest.for(["（（", "©©", "x\u0301y", "((((", "a{2,"] as const)(
    "should answer 200 for the hostile search %j",
    async (search, { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, "Sandstone");
      // Act
      const res = await client.samples.$get({
        query: { page: "1", perPage: "10", search },
      });
      // Assert
      expect(res.status).toBe(200);
    },
  );

  pgTest.for(["core basalt", "basalt core"])(
    "should require every token of %j to match, in any order",
    async (search, { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, "Basalt Core");
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names).toEqual(["Basalt Core"]);
    },
  );

  pgTest.for(["sand", "andsto"])(
    "should match the starless token %j as a free substring",
    async (search, { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, "Fontainebleau Sandstone");
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names).toEqual(["Fontainebleau Sandstone"]);
    },
  );

  pgTest.for([
    ["bas*", "Basalt Core", "Embassy Deposit"],
    ["bas*", "Basalt Core", "Rock-basalt"],
    ["*te", "Carbonate Core", "Textile Block"],
    ["carb*ate", "Carbonate Core", "Bicarbonate Block"],
    ["*bas*ic*", "Metabasaltic Rock", "Granite Block"],
    ["bas* core", "Basalt Core", "Basalt Powder"],
  ] as const)(
    "should match %j against the wildcard grammar",
    async ([search, matching, decoy], { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, matching);
      await createPublishedSample(client, decoy);
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names).toEqual([matching]);
    },
  );

  pgTest(
    "should search only the first 6 words of a longer search",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, "ab cd ef gh ij kl");
      await createPublishedSample(client, "Sandstone Block");
      // Act
      const names = await searchNames(client, "ab cd ef gh ij kl zz");
      // Assert
      expect(names).toEqual(["ab cd ef gh ij kl"]);
    },
  );

  pgTest.for(["*", "** *", "   "])(
    "should return no sample for the intentless search %j",
    async (search, { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, "Basalt Core");
      await createPublishedSample(client, "Sandstone Block");
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names).toEqual([]);
    },
  );

  pgTest.for([
    ["achondrites", ["Chondrites Fragment", "Stony Achondrite"]],
    ["basalts", ["Basalt"]],
  ] as const)(
    "should match %j to the words one edit away",
    async ([search, expected], { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      for (const name of [
        "Stony Achondrite",
        "Chondrites Fragment",
        "Basalt",
        "Sandstone Block",
      ]) {
        await createPublishedSample(client, name);
      }
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names.toSorted()).toEqual(expected);
    },
  );

  pgTest("should keep a short token exact", async ({ db }) => {
    // Arrange
    const client = await acceptedClient(db);
    await createPublishedSample(client, "Sane Block");
    // Act
    const names = await searchNames(client, "sand");
    // Assert
    expect(names).toEqual([]);
  });

  pgTest.for([
    ["as one segment", LONGEST_TOKEN],
    [
      "with two wildcards",
      `${LONGEST_TOKEN.slice(0, 9)}*${LONGEST_TOKEN.slice(10, 21)}*${LONGEST_TOKEN.slice(22)}`,
    ],
  ] as const)(
    "should find a sample by a token of the longest length %s",
    async ([, search], { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, LONGEST_TOKEN);
      await createPublishedSample(client, "Sandstone Block");
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect([search.length, names]).toEqual([32, [LONGEST_TOKEN]]);
    },
  );

  pgTest(
    "should list and count nothing for a token past the longest length",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createPublishedSample(client, "a".repeat(33));
      const query = { page: "1", perPage: "10", search: "a".repeat(33) };
      // Act
      const listed = await client.samples.$get({ query });
      const counted = await client.samples.facets.$get({ query });
      // Assert
      const { data: facets } = sampleFacetCountsResponseSchema.parse(
        await counted.json(),
      );
      expect({
        listed: [listed.status, await listed.json()],
        counted: [counted.status, facets],
      }).toEqual({
        listed: [200, { data: [], meta: { total: 0 } }],
        counted: [
          200,
          Object.fromEntries(Object.keys(facets).map((key) => [key, {}])),
        ],
      });
    },
  );

  pgTest("should not match an igsn fuzzily", async ({ db }) => {
    // Arrange
    const client = await acceptedClient(db);
    const published = await createPublishedSample(client, "Sandstone");
    const igsn = published.igsn!;
    const nearMiss = igsn.slice(0, -1) + (igsn.endsWith("Z") ? "Y" : "Z");
    // Act
    const names = await searchNames(client, nearMiss);
    // Assert
    expect(names).toEqual([]);
  });

  pgTest.for([
    ["Grès de Fontainebleau", "gres"],
    ["Stony Achondrite", "achondrites"],
  ] as const)(
    "should never return the unpublished %j from a search",
    async ([name, search], { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      await createSample(client, name);
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names).toEqual([]);
    },
  );

  pgTest(
    "should filter published samples by a bounding box",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      const app = createApp(db).app;
      const client = testClient(app);
      const inside = await createSample(client, "Inside", "Inside 001", {
        longitude: 5,
        latitude: 45,
      });
      await publishSample(client, inside.id);
      const outside = await createSample(client, "Outside", "Outside 001", {
        longitude: 100,
        latitude: 45,
      });
      await publishSample(client, outside.id);
      // Act
      const res = await app.request(
        "/samples?page=1&perPage=10&bbox=-10,40,10,50",
      );
      // Assert
      expect(res.status).toBe(200);
      const body = publicListSamplesResponseSchema.parse(await res.json());
      expect(body.meta.total).toBe(1);
      expect(body.data.map((s) => s.name)).toEqual(["Inside"]);
    },
  );

  pgTest(
    "should filter published samples by a bbox crossing the dateline",
    async ({ db }) => {
      await provisionUser(db, "test-token", { status: "accepted" });
      const app = createApp(db).app;
      const client = testClient(app);
      const inside = await createSample(client, "Fiji", "Fiji 001", {
        longitude: 178,
        latitude: 10,
      });
      await publishSample(client, inside.id);
      const outside = await createSample(
        client,
        "Gulf of Guinea",
        "Guinea 001",
        {
          longitude: 0,
          latitude: 10,
        },
      );
      await publishSample(client, outside.id);
      const res = await app.request(
        "/samples?page=1&perPage=10&bbox=170,0,-170,20",
      );
      expect(res.status).toBe(200);
      const body = publicListSamplesResponseSchema.parse(await res.json());
      expect(body.meta.total).toBe(1);
      expect(body.data.map((s) => s.name)).toEqual(["Fiji"]);
    },
  );

  pgTest(
    "should ignore a malformed bbox and still return 200",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      const app = createApp(db).app;
      const client = testClient(app);
      const draft = await createSample(client, "Grès de Fontainebleau");
      await publishSample(client, draft.id);
      // Act
      const res = await app.request(
        "/samples?page=1&perPage=10&bbox=-10,200,10,50",
      );
      // Assert
      expect(res.status).toBe(200);
      const body = publicListSamplesResponseSchema.parse(await res.json());
      expect(body.meta.total).toBe(1);
    },
  );

  pgTest(
    "should return a published sample by its igsn without authentication",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      const draft = await createSample(client, "Basalte du Massif Central");
      const published = await publishSample(client, draft.id);
      // Act
      const res = await client.samples[":igsn"].$get({
        param: { igsn: published.igsn! },
      });
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        data: { igsn: published.igsn, name: "Basalte du Massif Central" },
      });
    },
  );

  pgTest.for([
    { status: "withdrawn" },
    { status: "embargo", publishedAt: "2099-01-01" },
  ] satisfies SetSampleStatusBody[])(
    "should reduce a $status sample to its public whitelist",
    async (body, { db }) => {
      // Arrange
      const client = await acceptedClient(db);
      const published = await createPublishedSample(client, "Rhyolite retirée");
      await setSampleStatus(db, published.id, body);
      // Act
      const res = await client.samples[":igsn"].$get({
        param: { igsn: published.igsn! },
      });
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: {
          status: body.status,
          igsn: published.igsn,
          name: "Rhyolite retirée",
          nature: "powder",
          type: "individual_sample",
          material: "rock_and_sediment.sediment.exogenous_detritic.clay",
          specificName: "Rhyolite retirée 001",
          location: { region: null, localityName: null },
          collectorFirstname: null,
          collectorLastname: null,
          children: [],
          series: null,
        },
      });
    },
  );

  pgTest(
    "should expose the archive institutions, the rights holders and the archive contact name but never its email on a public payload",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      const published = await createPublishedSample(
        client,
        "Rhyolite archivée",
      );
      await db
        .updateTable("sample")
        .set({
          rep_current_archive_contact_firstname: "Ada",
          rep_current_archive_contact_lastname: "Archiviste",
          rep_current_archive_contact_email: "archive-public@univ-lorraine.fr",
        })
        .where("id", "=", published.id)
        .execute();
      // Act
      const detail = await client.samples[":igsn"].$get({
        param: { igsn: published.igsn! },
      });
      const list = await client.samples.$get({
        query: { page: "1", perPage: "10" },
      });
      // Assert
      const publicRepository = {
        ...PUBLIC_REPOSITORY,
        currentArchiveContactFirstname: "Ada",
        currentArchiveContactLastname: "Archiviste",
        currentArchiveContactEmail: null,
      };
      expect(await detail.json()).toMatchObject({
        data: { repository: publicRepository },
      });
      expect(await list.json()).toMatchObject({
        data: [{ repository: publicRepository }],
      });
    },
  );

  const linkCollector = async (
    db: Parameters<typeof createApp>[0],
    sampleId: string,
  ) => {
    const account = await insertUser(db, "mc-f62@univ-lorraine.fr", {
      firstname: "Marie",
      name: "Curié",
    });
    await db
      .updateTable("sample")
      .set({
        sc_collector_firstname: null,
        sc_collector_lastname: null,
        sc_collector_user_id: account.id,
      })
      .where("id", "=", sampleId)
      .execute();
  };

  pgTest(
    "should resolve a linked person's name and hide its account on a public payload",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      const published = await createPublishedSample(client, "Rhyolite liée");
      await linkCollector(db, published.id);
      // Act
      const detail = await client.samples[":igsn"].$get({
        param: { igsn: published.igsn! },
      });
      const list = await client.samples.$get({
        query: { page: "1", perPage: "10" },
      });
      // Assert
      const resolved = {
        collectorUserId: null,
        collectorFirstname: "Marie",
        collectorLastname: "Curié",
      };
      expect(await detail.json()).toMatchObject({
        data: { scientificContext: resolved },
      });
      expect(await list.json()).toMatchObject({
        data: [{ scientificContext: resolved }],
      });
    },
  );

  pgTest(
    "should expose the additional roles without their account links",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      const account = await insertUser(db, "ada@univ-lorraine.fr", {
        firstname: "Ada",
        name: "Lovelace",
      });
      const created = await client.admin.samples.$post(
        {
          json: {
            name: "Basalte des rôles",
            nature: "powder",
            type: "individual_sample",
            material: "rock_and_sediment.sediment.exogenous_detritic.clay",
            location: {
              position: { type: "point", longitude: 0, latitude: 0 },
            },
            description: {
              collectionDate: {
                precision: "day",
                start: "2026-01-01",
                end: "2026-01-01",
              },
            },
            existenceStatus: "exists",
            availabilityStatus: "available",
            scientificContext: {
              provenanceStatus: "research_project_sample",
              collectorFirstname: "Georges",
              collectorLastname: "Cuvier",
              additionalRoles: [
                { role: "researcher", personUserId: account.id },
                {
                  role: "data_manager",
                  personFirstname: "Marie",
                  personLastname: "Curié",
                },
              ],
            },
            repository: { currentArchiveOsu: "OASU" },
          },
        },
        { headers: authHeader },
      );
      const draft = sampleResponseSchema.parse(await created.json()).data;
      const published = await publishSample(client, draft.id);
      // Act
      const res = await client.samples[":igsn"].$get({
        param: { igsn: published.igsn! },
      });
      // Assert
      expect(await res.json()).toMatchObject({
        data: {
          scientificContext: {
            additionalRoles: [
              {
                role: "researcher",
                personUserId: null,
                personFirstname: "Ada",
                personLastname: "Lovelace",
              },
              {
                role: "data_manager",
                personUserId: null,
                personFirstname: "Marie",
                personLastname: "Curié",
              },
            ],
          },
        },
      });
    },
  );

  pgTest(
    "should keep a withdrawn sample's linked person resolved",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      const published = await createPublishedSample(client, "Rhyolite retirée");
      await linkCollector(db, published.id);
      await setSampleStatus(db, published.id, { status: "withdrawn" });
      // Act
      const res = await client.samples[":igsn"].$get({
        param: { igsn: published.igsn! },
      });
      // Assert
      expect(await res.json()).toMatchObject({
        data: {
          status: "withdrawn",
          collectorFirstname: "Marie",
          collectorLastname: "Curié",
        },
      });
    },
  );

  pgTest("should answer 404 for a tombstoned sample", async ({ db }) => {
    // Arrange
    const client = await acceptedClient(db);
    const published = await createPublishedSample(client, "Erased rhyolite");
    await setSampleStatus(db, published.id, { status: "tombstone" });
    // Act
    const res = await client.samples[":igsn"].$get({
      param: { igsn: published.igsn! },
    });
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should not expose an unpublished sample", async ({ db }) => {
    // Arrange
    const client = await acceptedClient(db);
    await createSample(client, "Grès de Fontainebleau");
    // Act
    const res = await client.samples[":igsn"].$get({
      param: { igsn: "0123456789ABCDEFGHJKMNPQRS" },
    });
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should answer 404 for an unknown igsn", async ({ db }) => {
    // Act
    const client = await acceptedClient(db);
    const res = await client.samples[":igsn"].$get({
      param: { igsn: "0123456789ABCDEFGHJKMNPQRS" },
    });
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should reject a malformed igsn with 400", async ({ db }) => {
    // Act
    const res = await createApp(db).app.request("/samples/not-an-igsn");
    // Assert
    expect(res.status).toBe(400);
  });

  pgTest(
    "should expose the owner's name but never their email on the public reads",
    async ({ db }) => {
      const client = await acceptedClient(db);
      const published = await createPublishedSample(client, "Basalte public");

      const list = await client.samples.$get({
        query: { page: "1", perPage: "10" },
      });
      const one = await client.samples[":igsn"].$get({
        param: { igsn: published.igsn! },
      });

      const listBody = (await list.json()) as {
        data: Record<string, unknown>[];
      };
      const oneBody = (await one.json()) as { data: Record<string, unknown> };
      expect(listBody.data[0]!.owner).toBeNull();
      expect(oneBody.data.owner).toEqual({ name: "User", firstname: "Test" });
      expect(JSON.stringify(oneBody)).not.toContain("@example.com");
    },
  );
});
