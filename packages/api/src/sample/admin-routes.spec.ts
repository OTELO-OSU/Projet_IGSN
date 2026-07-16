import {
  listSamplesResponseSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";

// requireAuth is stubbed suite-wide in test/setup.ts to gate on the Authorization
// header, so these tests just send (or omit) it.
const authHeader = { Authorization: "Bearer test-token" };

// Invalid payloads are sent through the raw request (the typed RPC client would
// reject them at compile time), so the server's runtime validation is exercised.
async function postSample(app: ReturnType<typeof createApp>, body: unknown) {
  return app.request("/admin/samples", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader },
    body: JSON.stringify(body),
  });
}

describe("admin sample routes", () => {
  pgTest("should create a sample and return 201", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
    // Act
    const res = await client.admin.samples.$post(
      {
        json: {
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: null,
          collectionMethod: null,
        },
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      data: { name: "Basalte du Massif Central", nature: "thin_section" },
    });
  });

  pgTest("should list created samples", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
    await client.admin.samples.$post(
      {
        json: {
          name: "Grès de Fontainebleau",
          nature: "rock_powder",
          type: null,
          collectionMethod: null,
        },
      },
      { headers: authHeader },
    );
    // Act
    const res = await client.admin.samples.$get(
      { query: { page: "1", perPage: "10" } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: [{ name: "Grès de Fontainebleau" }],
      meta: { total: 1 },
    });
  });

  describe("search", () => {
    pgTest(
      "should filter samples by name, ignoring case and diacritics",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db));
        await client.admin.samples.$post(
          {
            json: {
              name: "Grès de Fontainebleau",
              nature: "rock_powder",
              type: null,
              collectionMethod: null,
            },
          },
          { headers: authHeader },
        );
        await client.admin.samples.$post(
          {
            json: {
              name: "Basalte du Massif Central",
              nature: "thin_section",
              type: null,
              collectionMethod: null,
            },
          },
          { headers: authHeader },
        );
        // Act
        const res = await client.admin.samples.$get(
          { query: { page: "1", perPage: "10", search: "GRES" } },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
          data: [{ name: "Grès de Fontainebleau" }],
          meta: { total: 1 },
        });
      },
    );

    pgTest(
      "should return both published and unpublished samples that match",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db));
        // A publishable draft that is then published: admin search must still
        // see it, unlike the public route which is published-only.
        const created = await client.admin.samples.$post(
          {
            json: {
              name: "Granite published",
              nature: "thin_section",
              type: "individual_sample",
              material: "sediment.exogenous_detritic.clay",
              specificName: "GR-2026-001",
              location: {
                position: { type: "point", longitude: 3, latitude: 45 },
              },
            },
          },
          { headers: authHeader },
        );
        const { data } = sampleResponseSchema.parse(await created.json());
        await client.admin.samples[":id"].publish.$post(
          { param: { id: data.id } },
          { headers: authHeader },
        );
        await client.admin.samples.$post(
          {
            json: {
              name: "Granite draft",
              nature: "thin_section",
              type: null,
              collectionMethod: null,
            },
          },
          { headers: authHeader },
        );
        // A non-matching sample must be excluded by the filter.
        await client.admin.samples.$post(
          {
            json: {
              name: "Basalte du Massif Central",
              nature: "thin_section",
              type: null,
              collectionMethod: null,
            },
          },
          { headers: authHeader },
        );
        // Act
        const res = await client.admin.samples.$get(
          { query: { page: "1", perPage: "10", search: "granite" } },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        const body = listSamplesResponseSchema.parse(await res.json());
        expect(body.meta.total).toBe(2);
        expect(body.data.map((sample) => sample.name).sort()).toEqual([
          "Granite draft",
          "Granite published",
        ]);
      },
    );
  });

  pgTest("should get a sample by id", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
    const created = await client.admin.samples.$post(
      {
        json: {
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: null,
          collectionMethod: null,
        },
      },
      { headers: authHeader },
    );
    const { data } = sampleResponseSchema.parse(await created.json());
    // Act
    const res = await client.admin.samples[":id"].$get(
      { param: { id: data.id } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: { id: data.id, name: "Basalte du Massif Central" },
    });
  });

  pgTest("should answer 404 for an unknown sample id", async ({ db }) => {
    // Act
    const res = await testClient(createApp(db)).admin.samples[":id"].$get(
      { param: { id: "01890a5d-ac96-774b-bcce-b302099a8057" } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should update a sample", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
    const created = await client.admin.samples.$post(
      {
        json: {
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: null,
          collectionMethod: null,
        },
      },
      { headers: authHeader },
    );
    const { data } = sampleResponseSchema.parse(await created.json());
    // Act
    const res = await client.admin.samples[":id"].$put(
      {
        param: { id: data.id },
        json: {
          name: "Grès de Fontainebleau",
          nature: "rock_powder",
          type: null,
          collectionMethod: null,
        },
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: {
        id: data.id,
        name: "Grès de Fontainebleau",
        nature: "rock_powder",
      },
    });
  });

  pgTest("should answer 404 when updating a missing sample", async ({ db }) => {
    // Act
    const res = await testClient(createApp(db)).admin.samples[":id"].$put(
      {
        param: { id: "01890a5d-ac96-774b-bcce-b302099a8057" },
        json: {
          name: "Grès",
          nature: "rock_powder",
          type: null,
          collectionMethod: null,
        },
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should publish a sample", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
    const created = await client.admin.samples.$post(
      {
        json: {
          name: "Basalte du Massif Central",
          nature: "thin_section",
          type: "individual_sample",
          material: "sediment.exogenous_detritic.clay",
          collectionMethod: null,
          specificName: "MC-2026-007",
          location: { position: { type: "point", longitude: 3, latitude: 45 } },
        },
      },
      { headers: authHeader },
    );
    const { data } = sampleResponseSchema.parse(await created.json());
    // Act
    const res = await client.admin.samples[":id"].publish.$post(
      { param: { id: data.id } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ data: { id: data.id } });
  });

  pgTest(
    "should answer 409 when publishing a sample with no material",
    async ({ db }) => {
      // Arrange
      const client = testClient(createApp(db));
      const created = await client.admin.samples.$post(
        {
          json: {
            name: "Unclassified draft",
            nature: "thin_section",
            type: null,
          },
        },
        { headers: authHeader },
      );
      const { data } = sampleResponseSchema.parse(await created.json());
      // Act
      const res = await client.admin.samples[":id"].publish.$post(
        { param: { id: data.id } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(409);
    },
  );

  pgTest(
    "should answer 409 when publishing a sample with an internal-node material",
    async ({ db }) => {
      // Arrange
      const client = testClient(createApp(db));
      const created = await client.admin.samples.$post(
        {
          json: {
            name: "Rock draft",
            nature: "thin_section",
            type: null,
            material: "rock",
          },
        },
        { headers: authHeader },
      );
      const { data } = sampleResponseSchema.parse(await created.json());
      // Act
      const res = await client.admin.samples[":id"].publish.$post(
        { param: { id: data.id } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(409);
    },
  );

  pgTest("should publish a sample with no specific name", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db));
    const created = await client.admin.samples.$post(
      {
        json: {
          name: "No specific name",
          nature: "thin_section",
          type: "individual_sample",
          material: "sediment.exogenous_detritic.clay",
          location: { position: { type: "point", longitude: 3, latitude: 45 } },
        },
      },
      { headers: authHeader },
    );
    const { data } = sampleResponseSchema.parse(await created.json());
    // Act
    const res = await client.admin.samples[":id"].publish.$post(
      { param: { id: data.id } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
  });

  pgTest(
    "should answer 404 when publishing a missing sample",
    async ({ db }) => {
      // Act
      const res = await testClient(createApp(db)).admin.samples[
        ":id"
      ].publish.$post(
        { param: { id: "01890a5d-ac96-774b-bcce-b302099a8057" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(404);
    },
  );

  describe("validation", () => {
    pgTest("should reject an empty name with 400", async ({ db }) => {
      const res = await postSample(createApp(db), {
        name: "",
        nature: "rock_powder",
      });
      expect(res.status).toBe(400);
    });

    pgTest("should reject an unknown nature with 400", async ({ db }) => {
      const res = await postSample(createApp(db), {
        name: "Grès",
        nature: "Roche inconnue",
      });
      expect(res.status).toBe(400);
    });

    pgTest("should create a sample with a type", async ({ db }) => {
      const res = await postSample(createApp(db), {
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "core.section",
      });
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({
        data: { type: "core.section" },
      });
    });

    pgTest("should reject an unknown type with 400", async ({ db }) => {
      const res = await postSample(createApp(db), {
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: "half_round",
      });
      expect(res.status).toBe(400);
    });

    pgTest(
      "should create a sample with a collection method",
      async ({ db }) => {
        const res = await postSample(createApp(db), {
          name: "Basalte du Massif Central",
          nature: "thin_section",
          collectionMethod: "coring.gravity_corer",
          collectionMethodDescription: "Short barrel, soft sediment",
        });
        expect(res.status).toBe(201);
        expect(await res.json()).toMatchObject({
          data: {
            collectionMethod: "coring.gravity_corer",
            collectionMethodDescription: "Short barrel, soft sediment",
          },
        });
      },
    );

    pgTest(
      "should reject an unknown collection method with 400",
      async ({ db }) => {
        const res = await postSample(createApp(db), {
          name: "Basalte du Massif Central",
          nature: "thin_section",
          collectionMethod: "gravity_corer",
        });
        expect(res.status).toBe(400);
      },
    );

    pgTest("should reject unknown fields with 400", async ({ db }) => {
      const res = await postSample(createApp(db), {
        name: "Grès",
        nature: "rock_powder",
        extra: "x",
      });
      expect(res.status).toBe(400);
    });

    pgTest(
      "should create a sample with a leaf material path and texture",
      async ({ db }) => {
        const client = testClient(createApp(db));
        const res = await client.admin.samples.$post(
          {
            json: {
              name: "Basalt",
              nature: "thin_section",
              type: null,
              material: "rock.igneous.plutonic.felsic.granite",
              texture: "phaneritic",
            },
          },
          { headers: authHeader },
        );
        expect(res.status).toBe(201);
        expect(await res.json()).toMatchObject({
          data: {
            name: "Basalt",
            material: "rock.igneous.plutonic.felsic.granite",
            texture: "phaneritic",
          },
        });
      },
    );

    pgTest(
      "should reject a texture inconsistent with the material with 400",
      async ({ db }) => {
        const res = await postSample(createApp(db), {
          name: "Basalt",
          nature: "thin_section",
          material: "rock.igneous.volcanic.mafic.basalt",
          texture: "cumulate",
        });
        expect(res.status).toBe(400);
      },
    );

    pgTest(
      "should create a metamorphic sample with a facies",
      async ({ db }) => {
        const client = testClient(createApp(db));
        const res = await client.admin.samples.$post(
          {
            json: {
              name: "Gneiss",
              nature: "thin_section",
              type: null,
              material: "rock.metamorphic.strongly_metamorphosed.gneiss",
              metamorphicFacies: "amphibolite",
            },
          },
          { headers: authHeader },
        );
        expect(res.status).toBe(201);
        expect(await res.json()).toMatchObject({
          data: {
            name: "Gneiss",
            metamorphicFacies: "amphibolite",
          },
        });
      },
    );

    pgTest(
      "should create a metamorphic sample with no facies",
      async ({ db }) => {
        const client = testClient(createApp(db));
        const res = await client.admin.samples.$post(
          {
            json: {
              name: "Gneiss",
              nature: "thin_section",
              type: null,
              material: "rock.metamorphic.strongly_metamorphosed.gneiss",
            },
          },
          { headers: authHeader },
        );
        expect(res.status).toBe(201);
        expect(await res.json()).toMatchObject({
          data: {
            name: "Gneiss",
            material: "rock.metamorphic.strongly_metamorphosed.gneiss",
            metamorphicFacies: null,
          },
        });
      },
    );

    pgTest(
      "should reject a facies on a non-metamorphic material with 400",
      async ({ db }) => {
        const res = await postSample(createApp(db), {
          name: "Basalt",
          nature: "thin_section",
          material: "rock.igneous.volcanic.mafic.basalt",
          metamorphicFacies: "amphibolite",
        });
        expect(res.status).toBe(400);
      },
    );

    pgTest("should reject an unknown material with 400", async ({ db }) => {
      const res = await postSample(createApp(db), {
        name: "Grès",
        nature: "rock_powder",
        material: "lava",
      });
      expect(res.status).toBe(400);
    });

    pgTest("should reject an invalid update body with 400", async ({ db }) => {
      const res = await createApp(db).request(
        "/admin/samples/01890a5d-ac96-774b-bcce-b302099a8057",
        {
          method: "PUT",
          headers: { "content-type": "application/json", ...authHeader },
          body: JSON.stringify({ name: "", nature: "rock_powder" }),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("authentication", () => {
    pgTest("should reject an unauthenticated list with 401", async ({ db }) => {
      const res = await createApp(db).request("/admin/samples");
      expect(res.status).toBe(401);
    });

    pgTest("should reject an unauthenticated get with 401", async ({ db }) => {
      const res = await createApp(db).request(
        "/admin/samples/01890a5d-ac96-774b-bcce-b302099a8057",
      );
      expect(res.status).toBe(401);
    });

    pgTest(
      "should reject an unauthenticated create with 401",
      async ({ db }) => {
        const res = await createApp(db).request("/admin/samples", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Grès", nature: "rock_powder" }),
        });
        expect(res.status).toBe(401);
      },
    );

    pgTest(
      "should reject an unauthenticated update with 401",
      async ({ db }) => {
        const res = await createApp(db).request(
          "/admin/samples/01890a5d-ac96-774b-bcce-b302099a8057",
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "Grès", nature: "rock_powder" }),
          },
        );
        expect(res.status).toBe(401);
      },
    );

    pgTest(
      "should reject an unauthenticated publish with 401",
      async ({ db }) => {
        const res = await createApp(db).request(
          "/admin/samples/01890a5d-ac96-774b-bcce-b302099a8057/publish",
          { method: "POST" },
        );
        expect(res.status).toBe(401);
      },
    );
  });
});
