import {
  listSamplesResponseSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { setSampleStatus } from "./service/set-sample-status.ts";

const authHeader = { Authorization: "Bearer test-token" };

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
        nature: "rock_powder",
        type: "individual_sample",
        material: "sediment.exogenous_detritic.clay",
        specificName,
        location: { position: { type: "point", ...position } },
        description: {
          collectionDate: { start: "2026-01-01", end: "2026-01-01" },
        },
        existenceStatus: "exists",
        availabilityStatus: "available",
        scientificContext: {
          provenanceStatus: "collection_specimen",
          collectionCurator: "Georges Cuvier",
          collectionOrigin: "scientific_expedition",
        },
        repository: { currentArchive: "02feahw73" },
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
  const { data } = listSamplesResponseSchema.parse(await res.json());
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
    await setSampleStatus(db, retired.id, "withdrawn");
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
        query: { page: "1", perPage: "10", material: "sediment" },
      });
      expect(await match.json()).toMatchObject({
        data: [{ name: "Clay sample" }],
        meta: { total: 1 },
      });
      const miss = await client.samples.$get({
        query: { page: "1", perPage: "10", material: "rock" },
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
    ["%", "Recovery 100% core"],
    ["\\", "Path\\core"],
    ["(", "Core (deep)"],
    [".", "Core.A"],
    ["|", "Core|A"],
    ["（", "Core（deep）"],
    ["©", "Core © 2026"],
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

  pgTest.for(["（", "©", "́", "((((", "a{2,"] as const)(
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

  pgTest("should tolerate a plural in a long token", async ({ db }) => {
    // Arrange
    const client = await acceptedClient(db);
    await createPublishedSample(client, "Stony Achondrite");
    await createPublishedSample(client, "Sandstone Block");
    // Act
    const names = await searchNames(client, "achondrites");
    // Assert
    expect(names).toEqual(["Stony Achondrite"]);
  });

  pgTest("should reject a near-miss geological term", async ({ db }) => {
    const client = await acceptedClient(db);
    await createPublishedSample(client, "Chondrites Fragment");
    // Act
    const names = await searchNames(client, "achondrites");
    // Assert
    expect(names).toEqual([]);
  });

  pgTest("should keep a short token exact", async ({ db }) => {
    // Arrange
    process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD = "0.5";
    vi.resetModules();
    const { createApp: createLooseApp } = await import("../app.ts");
    await provisionUser(db, "test-token", { status: "accepted" });
    const client = testClient(createLooseApp(db).app);
    await createPublishedSample(client, "Sandstone Block");
    // Act
    const names = await searchNames(client, "sane");
    // Assert
    expect(names).toEqual([]);
  });

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
      const body = listSamplesResponseSchema.parse(await res.json());
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
      const body = listSamplesResponseSchema.parse(await res.json());
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
      const body = listSamplesResponseSchema.parse(await res.json());
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

  pgTest(
    "should reduce a withdrawn sample to its public whitelist",
    async ({ db }) => {
      // Arrange
      const client = await acceptedClient(db);
      const published = await createPublishedSample(client, "Rhyolite retirée");
      await setSampleStatus(db, published.id, "withdrawn");
      // Act
      const res = await client.samples[":igsn"].$get({
        param: { igsn: published.igsn! },
      });
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        data: {
          status: "withdrawn",
          igsn: published.igsn,
          name: "Rhyolite retirée",
          nature: "rock_powder",
          type: "individual_sample",
          material: "sediment.exogenous_detritic.clay",
          location: { region: null, localityName: null },
          collectorName: null,
          collectionCurator: "Georges Cuvier",
        },
      });
    },
  );

  pgTest(
    "should never expose the archive contacts on a public payload",
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
          rep_current_archive_contact: "archivist@example.org",
          rep_original_archive_contact: "museum@example.org",
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
      const redacted = {
        currentArchiveContact: null,
        originalArchiveContact: null,
      };
      expect(await detail.json()).toMatchObject({
        data: { repository: redacted },
      });
      expect(await list.json()).toMatchObject({
        data: [{ repository: redacted }],
      });
    },
  );

  pgTest("should answer 404 for a tombstoned sample", async ({ db }) => {
    // Arrange
    const client = await acceptedClient(db);
    const published = await createPublishedSample(client, "Erased rhyolite");
    await setSampleStatus(db, published.id, "tombstone");
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
