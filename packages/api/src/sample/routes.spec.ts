import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";

// Seed samples via the authenticated admin routes so the public reads have data.
const authHeader = { Authorization: "Bearer test-token" };

type Client = ReturnType<typeof testClient<ReturnType<typeof createApp>>>;

async function createSample(
  client: Client,
  name: string,
  specificName = `${name} 001`,
) {
  const created = await client.admin.samples.$post(
    // A leaf type, leaf material, a location and a specific name are required
    // to publish, so seed them all for the publish helper.
    {
      json: {
        name,
        nature: "rock_powder",
        type: "individual_sample",
        material: "sediment.exogenous_detritic.clay",
        specificName,
        location: { position: { type: "point", longitude: 0, latitude: 0 } },
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

describe("public sample routes", () => {
  pgTest("should list only published samples", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
    const draft = await createSample(client, "Grès de Fontainebleau");
    await publishSample(client, draft.id);
    await createSample(client, "Basalte du Massif Central"); // unpublished draft
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

  pgTest(
    "should filter published samples by name, ignoring case and diacritics",
    async ({ db }) => {
      // Arrange
      const client = testClient(createApp(db));
      const gres = await createSample(client, "Grès de Fontainebleau");
      await publishSample(client, gres.id);
      const basalt = await createSample(client, "Basalte du Massif Central");
      await publishSample(client, basalt.id);
      // Act
      const res = await client.samples.$get({
        query: { page: "1", perPage: "10", search: "GRES" },
      });
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        data: [{ name: "Grès de Fontainebleau" }],
        meta: { total: 1 },
      });
    },
  );

  pgTest("should filter published samples by specific name", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
    const match = await createSample(
      client,
      "Sandstone",
      "Fontainebleau facies",
    );
    await publishSample(client, match.id);
    const other = await createSample(client, "Basalt", "Massif Central facies");
    await publishSample(client, other.id);
    // Act
    const res = await client.samples.$get({
      query: { page: "1", perPage: "10", search: "fontainebleau" },
    });
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: [{ name: "Sandstone" }],
      meta: { total: 1 },
    });
  });

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

  pgTest(
    "should return an empty list when no sample matches the search",
    async ({ db }) => {
      // Arrange
      const client = testClient(createApp(db));
      const draft = await createSample(client, "Sandstone");
      await publishSample(client, draft.id);
      // Act
      const res = await client.samples.$get({
        query: { page: "1", perPage: "10", search: "granite" },
      });
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ data: [], meta: { total: 0 } });
    },
  );

  pgTest(
    "should treat like wildcards in the search literally",
    async ({ db }) => {
      // Arrange
      const client = testClient(createApp(db));
      const draft = await createSample(client, "Sandstone");
      await publishSample(client, draft.id);
      // Act: "%" would match everything if not escaped
      const res = await client.samples.$get({
        query: { page: "1", perPage: "10", search: "%" },
      });
      // Assert
      expect(await res.json()).toMatchObject({ data: [], meta: { total: 0 } });
    },
  );

  pgTest(
    "should never return an unpublished sample from a search",
    async ({ db }) => {
      // Arrange: matching draft, never published
      const client = testClient(createApp(db));
      await createSample(client, "Grès de Fontainebleau");
      // Act
      const res = await client.samples.$get({
        query: { page: "1", perPage: "10", search: "gres" },
      });
      // Assert
      expect(await res.json()).toMatchObject({ data: [], meta: { total: 0 } });
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
});
