import {
  adminListSamplesResponseSchema,
  adminSampleResponseSchema,
  listSamplesResponseSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { join } from "node:path";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";

// requireAuth is stubbed suite-wide in test/setup.ts to gate on the Authorization
// header, so these tests just send (or omit) it.
const authHeader = { Authorization: "Bearer test-token" };
const authenticatedCallerEmail = "test-token@example.com";

// Invalid payloads are sent through the raw request (the typed RPC client would
// reject them at compile time).
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
              availability: "exists",
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

  pgTest(
    "keeps a frozen collection date when a published edit tries to clear it",
    async ({ db }) => {
      // Arrange
      const client = testClient(createApp(db));
      const publishable = {
        name: "Basalte du Massif Central",
        nature: "thin_section" as const,
        type: "individual_sample",
        material: "sediment.exogenous_detritic.clay",
        location: {
          position: { type: "point" as const, longitude: 3, latitude: 45 },
        },
        description: {
          collectionDate: { start: "2026-01-01", end: "2026-01-01" },
        },
        availability: "exists" as const,
        scientificContext: {
          provenanceStatus: "historical_specimen" as const,
          collectionCurator: "Georges Cuvier",
          collectionOrigin: "scientific_expedition" as const,
        },
      };
      const created = await client.admin.samples.$post(
        { json: publishable },
        { headers: authHeader },
      );
      const { data } = sampleResponseSchema.parse(await created.json());
      await client.admin.samples[":id"].publish.$post(
        { param: { id: data.id } },
        { headers: authHeader },
      );
      // Act: try to clear the description; its collection date is a frozen leaf.
      const res = await client.admin.samples[":id"].$put(
        {
          param: { id: data.id },
          json: { ...publishable, description: null },
        },
        { headers: authHeader },
      );
      // Assert: the frozen collection date is preserved by the merge, so the
      // sample stays publishable and the edit is accepted (not a 409).
      expect(res.status).toBe(200);
      const kept = await client.admin.samples[":id"].$get(
        { param: { id: data.id } },
        { headers: authHeader },
      );
      expect(await kept.json()).toMatchObject({
        data: {
          description: {
            collectionDate: { start: "2026-01-01", end: "2026-01-01" },
          },
        },
      });
      const ok = await client.admin.samples[":id"].$put(
        {
          param: { id: data.id },
          json: { ...publishable, name: "Basalte (revu)" },
        },
        { headers: authHeader },
      );
      expect(ok.status).toBe(200);
    },
  );

  describe("published field lock", () => {
    const publishable = {
      name: "Basalte du Massif Central",
      nature: "thin_section" as const,
      type: "individual_sample",
      material: "sediment.exogenous_detritic.clay",
      specificName: "MC-2026-007",
      location: {
        position: { type: "point" as const, longitude: 3, latitude: 45 },
        localityName: "Puy de Sancy",
      },
      description: {
        collectionDate: { start: "2026-01-01", end: "2026-01-01" },
      },
      availability: "exists" as const,
      scientificContext: {
        provenanceStatus: "historical_specimen" as const,
        collectionCurator: "Georges Cuvier",
        collectionOrigin: "scientific_expedition" as const,
      },
    };

    type Client = ReturnType<typeof testClient<ReturnType<typeof createApp>>>;

    async function createAndPublish(client: Client, json = publishable) {
      const created = await client.admin.samples.$post(
        { json },
        { headers: authHeader },
      );
      const { data } = sampleResponseSchema.parse(await created.json());
      const published = await client.admin.samples[":id"].publish.$post(
        { param: { id: data.id } },
        { headers: authHeader },
      );
      // A fixture the publish route refuses would leave a draft behind, and
      // every lock assertion below would then hold vacuously.
      expect(published.status).toBe(200);
      return data;
    }

    pgTest(
      "ignores a frozen-field change and keeps the stored value",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db));
        const data = await createAndPublish(client);
        // Act: try to change the frozen name (and the material root, frozen
        // even though deeper levels refine) while editing an editable field.
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...publishable,
              name: "Renamed basalt",
              material: "rock.igneous.plutonic",
              specificName: "MC-EDIT-1",
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        const re = await client.admin.samples[":id"].$get(
          { param: { id: data.id } },
          { headers: authHeader },
        );
        const kept = sampleResponseSchema.parse(await re.json()).data;
        expect(kept.name).toBe("Basalte du Massif Central");
        expect(kept.material).toBe("sediment.exogenous_detritic.clay");
        expect(kept.specificName).toBe("MC-EDIT-1");
      },
    );

    pgTest(
      "keeps frozen coordinates but persists an editable locality edit",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db));
        const data = await createAndPublish(client);
        // Act: move the (frozen) coordinates and rename the (editable) locality.
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...publishable,
              location: {
                position: { type: "point", longitude: 99, latitude: 10 },
                localityName: "New locality",
              },
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        const re = await client.admin.samples[":id"].$get(
          { param: { id: data.id } },
          { headers: authHeader },
        );
        const kept = sampleResponseSchema.parse(await re.json()).data;
        expect(kept.location?.position).toMatchObject({
          longitude: 3,
          latitude: 45,
        });
        expect(kept.location?.localityName).toBe("New locality");
      },
    );

    // Only a complete material path publishes (material_incomplete otherwise),
    // so these two carry the full branch.
    const igneous = {
      ...publishable,
      material: "rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic" as const,
    };
    const metamorphic = {
      ...publishable,
      material: "rock.metamorphic.strongly_metamorphosed.gneiss",
      metamorphicFacies: "eclogite" as const,
    };

    pgTest(
      "persists a texture edit on a published igneous sample",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db));
        const data = await createAndPublish(client, igneous);
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: { ...igneous, texture: "cumulate" },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        const re = await client.admin.samples[":id"].$get(
          { param: { id: data.id } },
          { headers: authHeader },
        );
        const kept = sampleResponseSchema.parse(await re.json()).data;
        expect(kept.material).toBe(igneous.material);
        expect(kept.texture).toBe("cumulate");
      },
    );

    pgTest(
      "rejects with 409 an edit clearing the facies of a published metamorphic sample",
      async ({ db }) => {
        // Arrange: the facies is editable now, but clearing it introduces the
        // metamorphic_facies_missing blocker, which the guard rejects.
        const client = testClient(createApp(db));
        const data = await createAndPublish(client, metamorphic);
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: { ...metamorphic, metamorphicFacies: null },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(409);
        const re = await client.admin.samples[":id"].$get(
          { param: { id: data.id } },
          { headers: authHeader },
        );
        const kept = sampleResponseSchema.parse(await re.json()).data;
        expect(kept.metamorphicFacies).toBe("eclogite");
      },
    );

    pgTest(
      "keeps the stored texture and facies when the payload's material disagrees",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db));
        const data = await createAndPublish(client, igneous);
        // Act: another material carrying that material's own pair, which the
        // frozen material would make invalid.
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...igneous,
              material: metamorphic.material,
              texture: null,
              metamorphicFacies: "eclogite",
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        const re = await client.admin.samples[":id"].$get(
          { param: { id: data.id } },
          { headers: authHeader },
        );
        const kept = sampleResponseSchema.parse(await re.json()).data;
        expect(kept.material).toBe(igneous.material);
        expect(kept.texture).toBe("phaneritic");
        expect(kept.metamorphicFacies).toBeNull();
      },
    );

    pgTest(
      "rejects with 409 when the merged result clears a publish requirement",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db));
        const data = await createAndPublish(client);
        // Act: clear availability, a publish requirement (editable, so the merge
        // does take the cleared value; the publishable guard then rejects).
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: { ...publishable, availability: null },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({
          error: "Update would make the published sample unpublishable",
        });
        const re = await client.admin.samples[":id"].$get(
          { param: { id: data.id } },
          { headers: authHeader },
        );
        expect(
          sampleResponseSchema.parse(await re.json()).data.availability,
        ).toBe("exists");
      },
    );

    pgTest(
      "lets an already-broken published sample be edited without re-blocking it",
      async ({ db }) => {
        // Arrange: a published sample forced into a frozen-incomplete state (a
        // null material has no editable prefix, so it stays wholly frozen; only
        // reachable via DB tampering or a future publish constraint). It already
        // fails publishability on a FROZEN leaf.
        const client = testClient(createApp(db));
        const data = await createAndPublish(client);
        await db
          .updateTable("sample")
          .set({ material: null })
          .where("id", "=", data.id)
          .execute();
        // Act: change only an editable field. The merge keeps the frozen null
        // material, so the update introduces no NEW blocker.
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: { ...publishable, availability: "no_longer_exists" },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        const re = await client.admin.samples[":id"].$get(
          { param: { id: data.id } },
          { headers: authHeader },
        );
        expect(
          sampleResponseSchema.parse(await re.json()).data.availability,
        ).toBe("no_longer_exists");
      },
    );

    // These assert the ltree column, since that is where a silent loss shows.
    pgTest.for([
      [
        "persists a material refined below the frozen prefix",
        "rock.igneous.plutonic.felsic.granodiorite",
        "rock.igneous.plutonic.felsic.granodiorite",
      ],
      [
        "keeps the stored material on a change above the frozen prefix",
        "rock.igneous.volcanic.felsic.rhyolite",
        "rock.igneous.plutonic.felsic.granite",
      ],
    ] as const)("%s", async ([, material, persisted], { db }) => {
      const client = testClient(createApp(db));
      const data = await createAndPublish(client, igneous);
      const res = await client.admin.samples[":id"].$put(
        {
          param: { id: data.id },
          json: { ...publishable, material },
        },
        { headers: authHeader },
      );
      expect(res.status).toBe(200);
      const row = await db
        .selectFrom("sample")
        .select("material")
        .where("id", "=", data.id)
        .executeTakeFirstOrThrow();
      expect(row.material).toBe(persisted);
    });

    pgTest(
      "rejects with 409 a refinement rolled back to an incomplete path",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db));
        const data = await createAndPublish(client, igneous);
        // Act: drop the rock leaf. The merge takes it (it is at the frozen
        // prefix), so the edit introduces material_incomplete.
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: { ...publishable, material: "rock.igneous.plutonic.felsic" },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(409);
        const row = await db
          .selectFrom("sample")
          .select("material")
          .where("id", "=", data.id)
          .executeTakeFirstOrThrow();
        expect(row.material).toBe("rock.igneous.plutonic.felsic.granite");
      },
    );

    pgTest(
      "lets a completed material clear the blocker it already had",
      async ({ db }) => {
        // Arrange: a published sample left incomplete at an unlocked node (only
        // reachable via DB tampering), so material_incomplete pre-exists.
        const client = testClient(createApp(db));
        const data = await createAndPublish(client);
        await db
          .updateTable("sample")
          .set({ material: "sediment.exogenous_detritic" })
          .where("id", "=", data.id)
          .execute();
        // Act: complete the path. The delta guard must not block an edit that
        // FIXES a blocker.
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...publishable,
              material: "sediment.exogenous_detritic.sand.medium_sand",
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        const row = await db
          .selectFrom("sample")
          .select("material")
          .where("id", "=", data.id)
          .executeTakeFirstOrThrow();
        expect(row.material).toBe(
          "sediment.exogenous_detritic.sand.medium_sand",
        );
      },
    );

    pgTest(
      "reconciles attachments to the payload set on a published edit",
      async ({ db }) => {
        // Arrange
        const attachmentsDir = join(
          import.meta.dirname,
          "..",
          "..",
          "attachments",
        );
        const client = testClient(createApp(db, { attachmentsDir }));
        const data = await createAndPublish(client);
        const csv = new File(
          [new TextEncoder().encode("a,b\n1,2\n")],
          "m.csv",
          { type: "text/csv" },
        );
        const up = await client.admin.samples[":id"].attachments.$post(
          { param: { id: data.id }, form: { file: csv } },
          { headers: authHeader },
        );
        expect(up.status).toBe(201);
        // Act
        const res = await client.admin.samples[":id"].$put(
          { param: { id: data.id }, json: { ...publishable, attachments: [] } },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        const re = await client.admin.samples[":id"].$get(
          { param: { id: data.id } },
          { headers: authHeader },
        );
        expect(
          sampleResponseSchema.parse(await re.json()).data.attachments,
        ).toEqual([]);
      },
    );

    pgTest(
      "leaves every field writable on a draft (no merge)",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db));
        const created = await client.admin.samples.$post(
          {
            json: {
              name: "Draft granite",
              nature: "rock_powder",
              type: null,
              collectionMethod: null,
            },
          },
          { headers: authHeader },
        );
        const { data } = sampleResponseSchema.parse(await created.json());
        // Act: change the name, a field that would be frozen once published.
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              name: "Renamed draft",
              nature: "rock_powder",
              type: null,
              collectionMethod: null,
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        expect(sampleResponseSchema.parse(await res.json()).data.name).toBe(
          "Renamed draft",
        );
      },
    );
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

    // The owner guard skips a malformed id rather than querying it, so the
    // validator is what answers here, not a 403 or a failed uuid cast.
    pgTest("should reject a malformed sample id with 400", async ({ db }) => {
      const res = await createApp(db).request("/admin/samples/not-a-uuid", {
        headers: authHeader,
      });
      expect(res.status).toBe(400);
    });

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

  // The test client always authenticates as the single researcher test/setup.ts
  // provisions, so another researcher's sample is inserted directly.
  describe("authorization", () => {
    async function insertOtherResearcherSample(
      db: Parameters<typeof createApp>[0],
    ) {
      const other = await insertUser(db, "other@univ-lorraine.fr");
      const sample = await insertSample(db, {
        name: "Granite de Pierre",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
      });
      await insertSampleOwner(db, sample.id, other.id);
      return sample;
    }

    pgTest("should list only the caller's samples", async ({ db }) => {
      // Arrange
      const client = testClient(createApp(db));
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
      await insertOtherResearcherSample(db);
      // Act
      const res = await client.admin.samples.$get(
        { query: { page: "1", perPage: "10" } },
        { headers: authHeader },
      );
      // Assert
      const { data, meta } = listSamplesResponseSchema.parse(await res.json());
      expect(data.map((sample) => sample.name)).toEqual([
        "Basalte du Massif Central",
      ]);
      expect(meta.total).toBe(1);
    });

    pgTest(
      "should answer 403 when getting another researcher's sample",
      async ({ db }) => {
        // Arrange
        const sample = await insertOtherResearcherSample(db);
        // Act
        const res = await testClient(createApp(db)).admin.samples[":id"].$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should answer 403 when updating another researcher's sample",
      async ({ db }) => {
        // Arrange
        const sample = await insertOtherResearcherSample(db);
        // Act
        const res = await testClient(createApp(db)).admin.samples[":id"].$put(
          {
            param: { id: sample.id },
            json: {
              name: "Stolen granite",
              nature: "rock_powder",
              type: null,
              collectionMethod: null,
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should answer 403 when publishing another researcher's sample",
      async ({ db }) => {
        // Arrange
        const sample = await insertOtherResearcherSample(db);
        // Act
        const res = await testClient(createApp(db)).admin.samples[
          ":id"
        ].publish.$post({ param: { id: sample.id } }, { headers: authHeader });
        // Assert
        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should answer 403 when uploading to another researcher's sample",
      async ({ db }) => {
        // Arrange
        const sample = await insertOtherResearcherSample(db);
        // Act
        const res = await testClient(createApp(db)).admin.samples[
          ":id"
        ].attachments.$post(
          {
            param: { id: sample.id },
            form: {
              file: new File(["1,2\n"], "data.csv", { type: "text/csv" }),
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should answer 403 when downloading from another researcher's sample",
      async ({ db }) => {
        // Arrange
        const sample = await insertOtherResearcherSample(db);
        // Act
        const res = await createApp(db).request(
          `/admin/samples/${sample.id}/attachments/01890a5d-ac96-774b-bcce-b302099a8059`,
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should answer 403 when deleting another researcher's attachment",
      async ({ db }) => {
        // Arrange
        const sample = await insertOtherResearcherSample(db);
        // Act
        const res = await createApp(db).request(
          `/admin/samples/${sample.id}/attachments/01890a5d-ac96-774b-bcce-b302099a8059`,
          { method: "DELETE", headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(403);
      },
    );

    // Existence is still reported apart from ownership: an unknown id 404s.
    pgTest("should answer 403 for a sample nobody owns", async ({ db }) => {
      // Arrange
      const sample = await insertSample(db, {
        name: "Orphan granite",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
      });
      // Act
      const res = await testClient(createApp(db)).admin.samples[":id"].$get(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(403);
    });
  });

  describe("contributor authorization", () => {
    const draft = {
      name: "Basalte partagé",
      nature: "thin_section" as const,
      type: null,
      collectionMethod: null,
    };

    async function insertContributor(
      db: Parameters<typeof createApp>[0],
      sampleId: string,
      userId: string,
    ) {
      await db
        .insertInto("user_sample")
        .values({ sample_id: sampleId, user_id: userId, role: "contributor" })
        .execute();
    }

    async function shareWithCaller(
      db: Parameters<typeof createApp>[0],
      { published }: { published: boolean } = { published: false },
    ) {
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const caller = await insertUser(db, authenticatedCallerEmail);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, owner.id);
      await insertContributor(db, sample.id, caller.id);
      if (published) {
        await publishSample(db, sample.id);
      }
      return sample;
    }

    pgTest(
      "should record the author of a new sample as its owner",
      async ({ db }) => {
        const client = testClient(createApp(db));

        const created = await client.admin.samples.$post(
          { json: draft },
          { headers: authHeader },
        );

        const { data } = sampleResponseSchema.parse(await created.json());
        const rows = await db
          .selectFrom("user_sample")
          .select("role")
          .where("sample_id", "=", data.id)
          .execute();
        expect(rows).toEqual([{ role: "owner" }]);
      },
    );

    pgTest(
      "should let a contributor read and update a draft sample",
      async ({ db }) => {
        const client = testClient(createApp(db));
        const sample = await shareWithCaller(db);

        const read = await client.admin.samples[":id"].$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        const saved = await client.admin.samples[":id"].$put(
          {
            param: { id: sample.id },
            json: { ...draft, name: "Basalte relu" },
          },
          { headers: authHeader },
        );

        expect(read.status).toBe(200);
        expect(saved.status).toBe(200);
        expect(await saved.json()).toMatchObject({
          data: { id: sample.id, name: "Basalte relu" },
        });
      },
    );

    pgTest("should answer 403 when a contributor publishes", async ({ db }) => {
      const client = testClient(createApp(db));
      const sample = await shareWithCaller(db);

      const res = await client.admin.samples[":id"].publish.$post(
        { param: { id: sample.id } },
        { headers: authHeader },
      );

      expect(res.status).toBe(403);
      const kept = await client.admin.samples[":id"].$get(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      expect(await kept.json()).toMatchObject({
        data: { published: false, igsn: null },
      });
    });

    pgTest(
      "should answer 403 when a contributor updates a published sample",
      async ({ db }) => {
        const client = testClient(createApp(db));
        const sample = await shareWithCaller(db, { published: true });

        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: sample.id },
            json: { ...draft, name: "Basalte détourné" },
          },
          { headers: authHeader },
        );

        expect(res.status).toBe(403);
        const kept = await client.admin.samples[":id"].$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        expect(await kept.json()).toMatchObject({
          data: { name: "Basalte partagé", published: true },
        });
      },
    );

    pgTest(
      "should answer 403 when a contributor uploads to a published sample",
      async ({ db }) => {
        const client = testClient(createApp(db));
        const sample = await shareWithCaller(db, { published: true });

        const res = await client.admin.samples[":id"].attachments.$post(
          {
            param: { id: sample.id },
            form: {
              file: new File(["1,2\n"], "data.csv", { type: "text/csv" }),
            },
          },
          { headers: authHeader },
        );

        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should answer 403 when a contributor deletes an attachment of a published sample",
      async ({ db }) => {
        const sample = await shareWithCaller(db, { published: true });

        const res = await createApp(db).request(
          `/admin/samples/${sample.id}/attachments/01890a5d-ac96-774b-bcce-b302099a8059`,
          { method: "DELETE", headers: authHeader },
        );

        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should let a contributor upload an attachment to a draft sample",
      async ({ db }) => {
        const client = testClient(createApp(db));
        const sample = await shareWithCaller(db);

        const res = await client.admin.samples[":id"].attachments.$post(
          {
            param: { id: sample.id },
            form: {
              file: new File(["1,2\n"], "data.csv", { type: "text/csv" }),
            },
          },
          { headers: authHeader },
        );

        expect(res.status).toBe(201);
      },
    );

    pgTest(
      "should let a contributor delete an attachment of a draft sample",
      async ({ db }) => {
        const client = testClient(createApp(db));
        const sample = await shareWithCaller(db);
        const uploaded = await client.admin.samples[":id"].attachments.$post(
          {
            param: { id: sample.id },
            form: {
              file: new File(["1,2\n"], "data.csv", { type: "text/csv" }),
            },
          },
          { headers: authHeader },
        );
        const { data } = (await uploaded.json()) as { data: { id: string } };

        const res = await createApp(db).request(
          `/admin/samples/${sample.id}/attachments/${data.id}`,
          { method: "DELETE", headers: authHeader },
        );

        expect(res.status).toBe(204);
      },
    );
  });

  describe("owner and role in responses", () => {
    const draft = {
      name: "Basalte du Massif Central",
      nature: "thin_section" as const,
      type: null,
      collectionMethod: null,
    };

    pgTest("should carry the owner of each listed sample", async ({ db }) => {
      const client = testClient(createApp(db));
      await client.admin.samples.$post(
        { json: draft },
        { headers: authHeader },
      );

      const res = await client.admin.samples.$get(
        { query: { page: "1", perPage: "10" } },
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = adminListSamplesResponseSchema.parse(await res.json());
      expect(body.data).toEqual([
        expect.objectContaining({
          name: "Basalte du Massif Central",
          owner: { name: "User", firstname: "Test" },
        }),
      ]);
    });

    pgTest(
      "should list a shared sample once, with its owner",
      async ({ db }) => {
        const owner = await insertUser(db, "owner@univ-lorraine.fr");
        await db
          .updateTable("user")
          .set({ name: "Curie", firstname: "Marie" })
          .where("id", "=", owner.id)
          .execute();
        const caller = await insertUser(db, authenticatedCallerEmail);
        const sample = await insertSample(db, draft);
        await insertSampleOwner(db, sample.id, owner.id);
        await db
          .insertInto("user_sample")
          .values({
            sample_id: sample.id,
            user_id: caller.id,
            role: "contributor",
          })
          .execute();

        const res = await testClient(createApp(db)).admin.samples.$get(
          { query: { page: "1", perPage: "10" } },
          { headers: authHeader },
        );

        const body = adminListSamplesResponseSchema.parse(await res.json());
        expect(body.meta.total).toBe(1);
        expect(body.data).toEqual([
          expect.objectContaining({
            id: sample.id,
            owner: { name: "Curie", firstname: "Marie" },
          }),
        ]);
      },
    );

    pgTest("should carry the owner role of the caller", async ({ db }) => {
      const client = testClient(createApp(db));
      const created = await client.admin.samples.$post(
        { json: draft },
        { headers: authHeader },
      );
      const { data } = sampleResponseSchema.parse(await created.json());

      const res = await client.admin.samples[":id"].$get(
        { param: { id: data.id } },
        { headers: authHeader },
      );

      expect(adminSampleResponseSchema.parse(await res.json()).role).toBe(
        "owner",
      );
    });

    pgTest(
      "should carry the contributor role of the caller",
      async ({ db }) => {
        const owner = await insertUser(db, "owner@univ-lorraine.fr");
        const caller = await insertUser(db, authenticatedCallerEmail);
        const sample = await insertSample(db, draft);
        await insertSampleOwner(db, sample.id, owner.id);
        await db
          .insertInto("user_sample")
          .values({
            sample_id: sample.id,
            user_id: caller.id,
            role: "contributor",
          })
          .execute();

        const res = await testClient(createApp(db)).admin.samples[":id"].$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );

        expect(adminSampleResponseSchema.parse(await res.json()).role).toBe(
          "contributor",
        );
      },
    );
  });

  describe("contributor endpoints", () => {
    const draft = {
      name: "Basalte à partager",
      nature: "thin_section" as const,
      type: null,
      collectionMethod: null,
    };
    const colleagueHeader = { Authorization: "Bearer colleague" };

    async function arrangeOwnedSample(db: Parameters<typeof createApp>[0]) {
      const app = createApp(db);
      const owner = await insertUser(db, authenticatedCallerEmail);
      const colleague = await insertUser(db, "colleague@example.com");
      const created = await testClient(app).admin.samples.$post(
        { json: draft },
        { headers: authHeader },
      );
      const { data } = sampleResponseSchema.parse(await created.json());
      return { app, sample: data, owner, colleague };
    }

    pgTest(
      "should list a sample's contributors for its owner",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);
        await client.admin.samples[":id"].contributors.$post(
          { param: { id: sample.id }, json: { userId: colleague.id } },
          { headers: authHeader },
        );

        const res = await client.admin.samples[":id"].contributors.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
          data: [
            {
              id: colleague.id,
              email: "colleague@example.com",
              name: null,
              firstname: null,
            },
          ],
        });
      },
    );

    pgTest(
      "should give an added contributor access to the sample",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);

        const added = await client.admin.samples[":id"].contributors.$post(
          { param: { id: sample.id }, json: { userId: colleague.id } },
          { headers: authHeader },
        );

        expect(added.status).toBe(204);
        const read = await client.admin.samples[":id"].$get(
          { param: { id: sample.id } },
          { headers: colleagueHeader },
        );
        expect(read.status).toBe(200);
      },
    );

    pgTest(
      "should stay unchanged when the same contributor is added twice",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);
        await client.admin.samples[":id"].contributors.$post(
          { param: { id: sample.id }, json: { userId: colleague.id } },
          { headers: authHeader },
        );

        const again = await client.admin.samples[":id"].contributors.$post(
          { param: { id: sample.id }, json: { userId: colleague.id } },
          { headers: authHeader },
        );

        expect(again.status).toBe(204);
        const res = await client.admin.samples[":id"].contributors.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        expect(await res.json()).toMatchObject({
          data: [{ id: colleague.id }],
        });
      },
    );

    pgTest(
      "should keep the owner sole owner when they add themselves",
      async ({ db }) => {
        const { app, sample, owner } = await arrangeOwnedSample(db);
        const client = testClient(app);

        const res = await client.admin.samples[":id"].contributors.$post(
          { param: { id: sample.id }, json: { userId: owner.id } },
          { headers: authHeader },
        );

        expect(res.status).toBe(204);
        const listed = await client.admin.samples[":id"].contributors.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        expect(await listed.json()).toEqual({ data: [] });
        const rows = await db
          .selectFrom("user_sample")
          .selectAll()
          .where("sample_id", "=", sample.id)
          .execute();
        expect(rows).toEqual([
          { sample_id: sample.id, user_id: owner.id, role: "owner" },
        ]);
      },
    );

    pgTest("should answer 404 for an unknown user id", async ({ db }) => {
      const { app, sample } = await arrangeOwnedSample(db);

      const res = await testClient(app).admin.samples[":id"].contributors.$post(
        {
          param: { id: sample.id },
          json: { userId: "01890a5d-ac96-774b-bcce-b302099a8057" },
        },
        { headers: authHeader },
      );

      expect(res.status).toBe(404);
    });

    pgTest(
      "should answer 403 when a contributor lists contributors",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);
        await client.admin.samples[":id"].contributors.$post(
          { param: { id: sample.id }, json: { userId: colleague.id } },
          { headers: authHeader },
        );

        const res = await client.admin.samples[":id"].contributors.$get(
          { param: { id: sample.id } },
          { headers: colleagueHeader },
        );

        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should answer 403 when a contributor adds a contributor",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);
        await client.admin.samples[":id"].contributors.$post(
          { param: { id: sample.id }, json: { userId: colleague.id } },
          { headers: authHeader },
        );
        const stranger = await insertUser(db, "stranger@univ-lorraine.fr");

        const res = await client.admin.samples[":id"].contributors.$post(
          { param: { id: sample.id }, json: { userId: stranger.id } },
          { headers: colleagueHeader },
        );

        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should answer 403 when an unrelated researcher lists contributors",
      async ({ db }) => {
        const { app, sample } = await arrangeOwnedSample(db);

        const res = await testClient(app).admin.samples[
          ":id"
        ].contributors.$get(
          { param: { id: sample.id } },
          { headers: colleagueHeader },
        );

        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should answer 401 when the session is no longer active",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);
        vi.mocked(requireActiveSession).mockImplementationOnce(async (c) =>
          c.json({ error: "Unauthorized" }, 401),
        );

        const res = await testClient(app).admin.samples[
          ":id"
        ].contributors.$post(
          { param: { id: sample.id }, json: { userId: colleague.id } },
          { headers: authHeader },
        );

        expect(res.status).toBe(401);
      },
    );

    pgTest("should reject a malformed user id with 400", async ({ db }) => {
      const { app, sample } = await arrangeOwnedSample(db);

      const res = await app.request(
        `/admin/samples/${sample.id}/contributors`,
        {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeader },
          body: JSON.stringify({ userId: "not-a-uuid" }),
        },
      );

      expect(res.status).toBe(400);
    });

    pgTest("should reject an unknown body field with 400", async ({ db }) => {
      const { app, sample, colleague } = await arrangeOwnedSample(db);

      const res = await app.request(
        `/admin/samples/${sample.id}/contributors`,
        {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeader },
          body: JSON.stringify({ userId: colleague.id, role: "owner" }),
        },
      );

      expect(res.status).toBe(400);
    });

    pgTest(
      "should reject an unauthenticated contributor add with 401",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);

        const res = await app.request(
          `/admin/samples/${sample.id}/contributors`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ userId: colleague.id }),
          },
        );

        expect(res.status).toBe(401);
      },
    );
  });
});
