import {
  listSamplesResponseSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";

const authHeader = { Authorization: "Bearer test-token" };

type Client = ReturnType<typeof testClient<ReturnType<typeof createApp>>>;

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
    // A leaf type, leaf material, a location, a collection date, a specific
    // name and an availability are required to publish, so seed them all for the
    // publish helper.
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
        availability: "exists",
        scientificContext: {
          provenanceStatus: "historical_specimen",
          collectionCurator: "Georges Cuvier",
          collectionOrigin: "scientific_expedition",
        },
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
    const client = testClient(createApp(db));
    const draft = await createSample(client, "Grès de Fontainebleau");
    await publishSample(client, draft.id);
    await createSample(client, "Basalte du Massif Central");
    // Act
    const res = await client.samples.$get({
      query: { page: "1", perPage: "10" },
    });
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: [{ name: "Grès de Fontainebleau", published: true }],
      meta: { total: 1 },
    });
  });

  // "GRES" hits the name, "facies" the specific name; igsn, the third searched
  // column, needs the minted value and stays on its own below.
  pgTest.for(["GRES", "facies"])(
    "should filter published samples on %j, ignoring case and diacritics",
    async (search, { db }) => {
      // Arrange
      const client = testClient(createApp(db));
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
      // Arrange: material is sediment.exogenous_detritic.clay, so it is under
      // "sediment" but not under "rock".
      const client = testClient(createApp(db));
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
    const client = testClient(createApp(db));
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

  pgTest.for(["granite", "granite core"])(
    "should return an empty list when %j matches nothing",
    async (search, { db }) => {
      // Arrange: "core" alone would match, but every token must.
      const client = testClient(createApp(db));
      await createPublishedSample(client, "Basalt Core");
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names).toEqual([]);
    },
  );

  // The ASCII metacharacters, plus the fullwidth forms unaccent() folds back
  // into them ("（" becomes "(", "©" becomes "(C)"). Unescaped, each is a silent
  // wildcard or a 500 on a public endpoint.
  pgTest.for([
    ["%", "Recovery 100% core"],
    ["_", "Log_1 core"],
    ["\\", "Path\\core"],
    ["(", "Core (deep)"],
    [")", "Core (deep)"],
    ["+", "Core +1"],
    ["|", "Core|A"],
    ["?", "Core?"],
    ["{", "Core {1}"],
    ["}", "Core {1}"],
    ["[", "Core [1]"],
    ["]", "Core [1]"],
    [".", "Core.A"],
    ["^", "Core^A"],
    ["$", "Core$A"],
    ["（", "Core（deep）"],
    ["）", "Core（deep）"],
    ["＋", "Core＋1"],
    ["｜", "Core｜A"],
    ["？", "Core？"],
    ["｛", "Core｛1｝"],
    ["｝", "Core｛1｝"],
    ["［", "Core［1］"],
    ["］", "Core［1］"],
    ["＼", "Core＼A"],
    ["．", "Core．A"],
    ["＾", "Core＾A"],
    ["＄", "Core＄A"],
    // Expands to "(C)": only escaping after unaccent covers the ")".
    ["©", "Core © 2026"],
    ["«", "Core «A»"],
    ["±", "Core ±1"],
  ] as const)(
    "should treat the pattern character %j literally",
    async ([character, matching], { db }) => {
      // Arrange
      const client = testClient(createApp(db));
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
      const client = testClient(createApp(db));
      await createPublishedSample(client, "Sandstone");
      // Act
      const res = await client.samples.$get({
        query: { page: "1", perPage: "10", search },
      });
      // Assert: an invalid regex would surface as an unhandled 500.
      expect(res.status).toBe(200);
    },
  );

  pgTest.for(["core basalt", "basalt core"])(
    "should require every token of %j to match, in any order",
    async (search, { db }) => {
      // Arrange
      const client = testClient(createApp(db));
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
      const client = testClient(createApp(db));
      await createPublishedSample(client, "Fontainebleau Sandstone");
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names).toEqual(["Fontainebleau Sandstone"]);
    },
  );

  // The starless side of a wildcard anchors to a word boundary, and a wildcard
  // never spans a space. Each decoy carries the literal where an anchor must
  // reject it: "Embassy" holds "bas" mid-word, "Textile" holds "te" at a word
  // start, "Bicarbonate" holds "carb" mid-word.
  pgTest.for([
    ["bas*", "Basalt Core", "Embassy Deposit"],
    ["*te", "Carbonate Core", "Textile Block"],
    ["carb*ate", "Carbonate Core", "Bicarbonate Block"],
    // Only the middle wildcard sits between two literals.
    ["*bas*ic*", "Metabasaltic Rock", "Granite Block"],
    ["bas* core", "Basalt Core", "Basalt Powder"],
  ] as const)(
    "should match %j against the wildcard grammar",
    async ([search, matching, decoy], { db }) => {
      // Arrange
      const client = testClient(createApp(db));
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
      // Arrange: a query of blanks or bare wildcards states no term, so it
      // matches nothing rather than the whole registry.
      const client = testClient(createApp(db));
      await createPublishedSample(client, "Basalt Core");
      await createPublishedSample(client, "Sandstone Block");
      // Act
      const names = await searchNames(client, search);
      // Assert
      expect(names).toEqual([]);
    },
  );

  pgTest("should tolerate a plural in a long token", async ({ db }) => {
    // Arrange: not a substring, so only the fuzzy arm can match (0.833).
    const client = testClient(createApp(db));
    await createPublishedSample(client, "Stony Achondrite");
    await createPublishedSample(client, "Sandstone Block");
    // Act
    const names = await searchNames(client, "achondrites");
    // Assert
    expect(names).toEqual(["Stony Achondrite"]);
  });

  pgTest("should reject a near-miss geological term", async ({ db }) => {
    // 0.750 against "chondrites", so the 0.8 threshold keeps an opposite
    // category out; the cost is "basalts"/"Basalt", also 0.750.
    const client = testClient(createApp(db));
    await createPublishedSample(client, "Chondrites Fragment");
    // Act
    const names = await searchNames(client, "achondrites");
    // Assert
    expect(names).toEqual([]);
  });

  pgTest("should keep a short token exact", async ({ db }) => {
    // Arrange: "sane" scores 0.6, so only the length gate keeps it exact. The
    // threshold is read at import, so a looser one needs a fresh module.
    process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD = "0.5";
    vi.resetModules();
    const { createApp: createLooseApp } = await import("../app.ts");
    const client = testClient(createLooseApp(db));
    await createPublishedSample(client, "Sandstone Block");
    // Act
    const names = await searchNames(client, "sane");
    // Assert
    expect(names).toEqual([]);
  });

  pgTest("should not match an igsn fuzzily", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
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
    // Not a substring of the name: only the fuzzy arm would match this draft.
    ["Stony Achondrite", "achondrites"],
  ] as const)(
    "should never return the unpublished %j from a search",
    async ([name, search], { db }) => {
      // Arrange
      const client = testClient(createApp(db));
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
      const app = createApp(db);
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
      // Act: raw request, bbox is a URL string the domain schema parses.
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
    "should ignore a malformed bbox and still return 200",
    async ({ db }) => {
      // Arrange
      const app = createApp(db);
      const client = testClient(app);
      const draft = await createSample(client, "Grès de Fontainebleau");
      await publishSample(client, draft.id);
      // Act: an out-of-range bbox degrades to no filter (resilient schema).
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
      const client = testClient(createApp(db));
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

  pgTest("should not expose an unpublished sample", async ({ db }) => {
    // Arrange: a draft never gets an igsn, so it is unreachable by the public get.
    const client = testClient(createApp(db));
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
    const res = await testClient(createApp(db)).samples[":igsn"].$get({
      param: { igsn: "0123456789ABCDEFGHJKMNPQRS" },
    });
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should reject a malformed igsn with 400", async ({ db }) => {
    // Act
    const res = await createApp(db).request("/samples/not-an-igsn");
    // Assert
    expect(res.status).toBe(400);
  });

  pgTest("should expose no owner on the public reads", async ({ db }) => {
    const client = testClient(createApp(db));
    const published = await createPublishedSample(client, "Basalte public");

    const list = await client.samples.$get({
      query: { page: "1", perPage: "10" },
    });
    const one = await client.samples[":igsn"].$get({
      param: { igsn: published.igsn! },
    });

    const listBody = (await list.json()) as { data: Record<string, unknown>[] };
    const oneBody = (await one.json()) as { data: Record<string, unknown> };
    expect(listBody.data[0]).not.toHaveProperty("owner");
    expect(oneBody.data).not.toHaveProperty("owner");
    expect(JSON.stringify(oneBody)).not.toContain("@example.com");
  });
});
