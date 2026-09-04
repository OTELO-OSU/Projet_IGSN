import type { SampleStatus } from "@projet-igsn/domain/sample/sample";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";
import type { SampleCollaboratorsResponse } from "@projet-igsn/domain/user-sample/user-sample-validator";

import { sampleEditLockResponseSchema } from "@projet-igsn/domain/sample/edit-lock";
import {
  adminListSamplesResponseSchema,
  adminSampleResponseSchema,
  listSamplesResponseSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect } from "vitest";

import type { SendMail } from "../mail/send-mail.ts";

import { createApp } from "../app.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { readSample } from "../tests/read-sample.ts";
import {
  attachGroup,
  draft,
  publishableSample,
} from "../tests/sample-fixtures.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { acquireEditLock } from "./service/acquire-edit-lock.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";
import { setSampleStatus } from "./service/set-sample-status.ts";

const attachmentsDir = join(import.meta.dirname, "..", "..", "attachments");

const authHeader = { Authorization: "Bearer test-token" };
const authenticatedCallerEmail = "test-token@example.com";

const publishable = {
  ...publishableSample,
  specificName: "MC-2026-007",
  location: {
    position: { type: "point" as const, longitude: 3, latitude: 45 },
    localityName: "Puy de Sancy",
  },
};

type Client = ReturnType<
  typeof testClient<ReturnType<typeof createApp>["app"]>
>;

async function createSample(
  db: Parameters<typeof provisionUser>[0],
  client: Client,
  json: typeof publishableSample = publishable,
  moderation: Parameters<typeof provisionUser>[2] = { status: "accepted" },
) {
  await provisionUser(db, "test-token", moderation);
  const created = await client.admin.samples.$post(
    { json },
    { headers: authHeader },
  );
  return sampleResponseSchema.parse(await created.json()).data;
}

async function createAndPublish(
  db: Parameters<typeof provisionUser>[0],
  client: Client,
  json = publishable,
  moderation?: Parameters<typeof provisionUser>[2],
) {
  const { id } = await createSample(db, client, json, moderation);
  const published = await client.admin.samples[":id"].publish.$post(
    { param: { id } },
    { headers: authHeader },
  );
  expect(published.status).toBe(200);
  return sampleResponseSchema.parse(await published.json()).data;
}

async function postSample(
  app: ReturnType<typeof createApp>["app"],
  body: unknown,
) {
  return app.request("/admin/samples", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader },
    body: JSON.stringify(body),
  });
}

async function putSample(
  app: ReturnType<typeof createApp>["app"],
  id: string,
  body: unknown,
) {
  return app.request(`/admin/samples/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeader },
    body: JSON.stringify(body),
  });
}

describe("admin sample routes", () => {
  pgTest("should create a sample and return 201", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db).app);
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

  describe("institutional groups snapshot", () => {
    const CALLER_GROUPS = {
      institutionalOrganization: "04vfs2w97",
      institutionalOsu: "OTELo",
      institutionalLaboratory: "UMR7358",
    };

    const draft = {
      name: "Basalte du Massif Central",
      nature: "thin_section" as const,
      type: null,
      collectionMethod: null,
    };

    pgTest(
      "should copy the caller's groups onto a new sample",
      async ({ db }) => {
        // Arrange
        await insertUser(db, authenticatedCallerEmail, CALLER_GROUPS);
        // Act
        const res = await testClient(createApp(db).app).admin.samples.$post(
          { json: draft },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(201);
        expect(sampleResponseSchema.parse(await res.json()).data).toMatchObject(
          CALLER_GROUPS,
        );
      },
    );

    pgTest(
      "should keep the snapshot of a sample declared before the owner moved lab",
      async ({ db }) => {
        // Arrange
        const NEW_GROUPS = {
          institutionalOrganization: "02rx3b187",
          institutionalOsu: "OSUG",
          institutionalLaboratory: "UMR5275",
        };
        await insertUser(db, authenticatedCallerEmail, {
          status: "accepted",
          superAdmin: true,
          ...CALLER_GROUPS,
        });
        const client = testClient(createApp(db).app);
        const created = await client.admin.samples.$post(
          { json: publishableSample },
          { headers: authHeader },
        );
        const before = sampleResponseSchema.parse(await created.json()).data;
        // Act
        await client.admin.currentUser["institutional-groups"].$put(
          { json: NEW_GROUPS },
          { headers: authHeader },
        );
        const updated = await client.admin.samples[":id"].$put(
          {
            param: { id: before.id },
            json: {
              ...publishableSample,
              name: "Basalte (revu)",
              expectedUpdatedAt: before.updatedAt,
            },
          },
          { headers: authHeader },
        );
        const published = await client.admin.samples[":id"].publish.$post(
          { param: { id: before.id } },
          { headers: authHeader },
        );
        // Assert
        expect(updated.status).toBe(200);
        expect(published.status).toBe(200);
        expect(
          sampleResponseSchema.parse(await published.json()).data,
        ).toMatchObject(CALLER_GROUPS);
      },
    );

    pgTest("should refuse a body choosing its own groups", async ({ db }) => {
      // Act
      const res = await postSample(createApp(db).app, {
        ...draft,
        ...CALLER_GROUPS,
      });
      // Assert
      expect(res.status).toBe(400);
    });
  });

  pgTest("should list created samples", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db).app);
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
        const client = testClient(createApp(db).app);
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
        await provisionUser(db, "test-token", { status: "accepted" });
        const client = testClient(createApp(db).app);
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
              existenceStatus: "exists",
              availabilityStatus: "available",
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
    const client = testClient(createApp(db).app);
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
    const res = await testClient(createApp(db).app).admin.samples[":id"].$get(
      { param: { id: "01890a5d-ac96-774b-bcce-b302099a8057" } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should update a sample", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db).app);
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
          expectedUpdatedAt: data.updatedAt,
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

  describe("overwrite guard", () => {
    const draftSample = {
      name: "Basalte du Massif Central",
      nature: "thin_section" as const,
      type: null,
      collectionMethod: null,
    };

    async function createDraft(app: ReturnType<typeof createApp>["app"]) {
      const created = await postSample(app, draftSample);
      return sampleResponseSchema.parse(await created.json()).data;
    }

    pgTest(
      "should reject a save built on an older version of the sample",
      async ({ db }) => {
        // Arrange
        const app = createApp(db).app;
        const sample = await createDraft(app);
        // Act
        const res = await putSample(app, sample.id, {
          ...draftSample,
          name: "Grès de Fontainebleau",
          expectedUpdatedAt: new Date(sample.updatedAt.getTime() - 1000),
        });
        // Assert
        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({
          error: expect.any(String),
          reason: "stale",
        });
        const kept = await app.request(`/admin/samples/${sample.id}`, {
          headers: authHeader,
        });
        expect(await kept.json()).toMatchObject({
          data: { name: "Basalte du Massif Central" },
        });
      },
    );

    pgTest(
      "should leave the attachments untouched when it rejects a stale save",
      async ({ db }) => {
        // Arrange
        const app = createApp(db, { attachmentsDir }).app;
        const sample = await createDraft(app);
        const form = new FormData();
        form.set(
          "file",
          new File([new TextEncoder().encode("a,b\n1,2\n")], "m.csv", {
            type: "text/csv",
          }),
        );
        const uploaded = await app.request(
          `/admin/samples/${sample.id}/attachments`,
          { method: "POST", headers: authHeader, body: form },
        );
        expect(uploaded.status).toBe(201);
        // Act
        const res = await putSample(app, sample.id, {
          ...draftSample,
          attachments: [],
          expectedUpdatedAt: new Date(sample.updatedAt.getTime() - 1000),
        });
        // Assert
        expect(res.status).toBe(409);
        const kept = await app.request(`/admin/samples/${sample.id}`, {
          headers: authHeader,
        });
        expect(
          adminSampleResponseSchema.parse(await kept.json()).data.attachments,
        ).toMatchObject([{ name: "m.csv" }]);
      },
    );

    pgTest(
      "should advance the version on a save and accept the next one carrying it",
      async ({ db }) => {
        // Arrange
        const app = createApp(db).app;
        const sample = await createDraft(app);
        const before = new Date("2026-01-01T00:00:00.000Z");
        await db
          .updateTable("sample")
          .set({ updated_at: before })
          .where("id", "=", sample.id)
          .execute();
        // Act
        const first = await putSample(app, sample.id, {
          ...draftSample,
          name: "Grès de Fontainebleau",
          expectedUpdatedAt: before,
        });
        const saved = sampleResponseSchema.parse(await first.json()).data;
        const second = await putSample(app, sample.id, {
          ...draftSample,
          name: "Grès relu",
          expectedUpdatedAt: saved.updatedAt,
        });
        // Assert
        expect(first.status).toBe(200);
        expect(saved.updatedAt.getTime()).toBeGreaterThan(before.getTime());
        expect(second.status).toBe(200);
      },
    );

    pgTest.for([
      ["no expectedUpdatedAt at all", {}],
      ["a malformed expectedUpdatedAt", { expectedUpdatedAt: "yesterday" }],
    ] as const)("should answer 400 for %s", async ([, body], { db }) => {
      // Arrange
      const app = createApp(db).app;
      const sample = await createDraft(app);
      // Act
      const res = await putSample(app, sample.id, { ...draftSample, ...body });
      // Assert
      expect(res.status).toBe(400);
    });
  });

  describe("edit lock", () => {
    const draftSample = {
      name: "Basalte du Massif Central",
      nature: "thin_section" as const,
      type: null,
      collectionMethod: null,
    };

    async function arrangeSample(db: Parameters<typeof createApp>[0]) {
      await provisionUser(db, "test-token", { status: "accepted" });
      const app = createApp(db).app;
      const created = await postSample(app, draftSample);
      return {
        app,
        sample: sampleResponseSchema.parse(await created.json()).data,
      };
    }

    async function lockedByPierre(
      db: Parameters<typeof createApp>[0],
      sampleId: string,
    ) {
      const pierre = await insertUser(db, "pierre@univ-lorraine.fr", {
        name: "Pierre Martin",
      });
      await acquireEditLock(db, sampleId, pierre.id);
      return pierre;
    }

    const putLock = (app: ReturnType<typeof createApp>["app"], id: string) =>
      app.request(`/admin/samples/${id}/lock`, {
        method: "PUT",
        headers: authHeader,
      });

    const deleteLock = (app: ReturnType<typeof createApp>["app"], id: string) =>
      app.request(`/admin/samples/${id}/lock`, {
        method: "DELETE",
        headers: authHeader,
      });

    pgTest("should claim a sample nobody is editing", async ({ db }) => {
      // Arrange
      const { app, sample } = await arrangeSample(db);
      // Act
      const res = await putLock(app, sample.id);
      // Assert
      expect(res.status).toBe(200);
      expect(
        sampleEditLockResponseSchema.parse(await res.json()).lock,
      ).toMatchObject({ name: "User", firstname: "Test" });
    });

    pgTest(
      "should refuse a claim on a sample another user is editing and name them",
      async ({ db }) => {
        // Arrange
        const { app, sample } = await arrangeSample(db);
        const pierre = await lockedByPierre(db, sample.id);
        // Act
        const res = await putLock(app, sample.id);
        // Assert
        expect(res.status).toBe(409);
        expect(await res.json()).toMatchObject({
          error: expect.any(String),
          reason: "locked",
          lock: { userId: pierre.id, name: "Pierre Martin" },
        });
      },
    );

    pgTest(
      "should let the next claim through once the holder releases it",
      async ({ db }) => {
        // Arrange
        const { app, sample } = await arrangeSample(db);
        const claimed = await putLock(app, sample.id);
        // Act
        const released = await deleteLock(app, sample.id);
        // Assert
        const marie = await insertUser(db, "marie@univ-lorraine.fr");
        expect(claimed.status).toBe(200);
        expect(released.status).toBe(204);
        expect(await acquireEditLock(db, sample.id, marie.id)).toMatchObject({
          userId: marie.id,
        });
      },
    );

    pgTest.for([
      [
        "a save",
        (app, id, sample) =>
          putSample(app, id, {
            ...draftSample,
            expectedUpdatedAt: sample.updatedAt,
          }),
      ],
      [
        "a publish",
        (app, id) =>
          app.request(`/admin/samples/${id}/publish`, {
            method: "POST",
            headers: authHeader,
          }),
      ],
      [
        "an attachment upload",
        (app, id) => {
          const form = new FormData();
          form.set("file", new File(["a,b\n"], "m.csv", { type: "text/csv" }));
          return app.request(`/admin/samples/${id}/attachments`, {
            method: "POST",
            headers: authHeader,
            body: form,
          });
        },
      ],
      [
        "an attachment deletion",
        (app, id) =>
          app.request(
            `/admin/samples/${id}/attachments/01890a5d-ac96-774b-bcce-b302099a8059`,
            { method: "DELETE", headers: authHeader },
          ),
      ],
    ] as [
      string,
      (
        app: ReturnType<typeof createApp>["app"],
        id: string,
        sample: { updatedAt: Date },
      ) => Promise<Response>,
    ][])(
      "should refuse %s while another user is editing",
      async ([, write], { db }) => {
        // Arrange
        const { app, sample } = await arrangeSample(db);
        await lockedByPierre(db, sample.id);
        // Act
        const res = await write(app, sample.id, sample);
        // Assert
        expect(res.status).toBe(409);
        expect(await res.json()).toMatchObject({ reason: "locked" });
      },
    );

    pgTest("should answer 404 on an unknown sample", async ({ db }) => {
      // Act
      const res = await putLock(
        createApp(db).app,
        "01890a5d-ac96-774b-bcce-b302099a8057",
      );
      // Assert
      expect(res.status).toBe(404);
    });

    pgTest(
      "should answer 403 to a user with no role on the sample",
      async ({ db }) => {
        // Arrange
        const other = await insertUser(db, "other@univ-lorraine.fr");
        const sample = await insertSample(db, draftSample);
        await insertSampleOwner(db, sample.id, other.id);
        const app = createApp(db).app;
        // Act
        const claim = await putLock(app, sample.id);
        const release = await deleteLock(app, sample.id);
        // Assert
        expect(claim.status).toBe(403);
        expect(release.status).toBe(403);
      },
    );
  });

  pgTest(
    "keeps a frozen collection date when a published edit tries to clear it",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      const client = testClient(createApp(db).app);
      const created = await client.admin.samples.$post(
        { json: publishableSample },
        { headers: authHeader },
      );
      const { data } = sampleResponseSchema.parse(await created.json());
      await client.admin.samples[":id"].publish.$post(
        { param: { id: data.id } },
        { headers: authHeader },
      );
      // Act
      const res = await client.admin.samples[":id"].$put(
        {
          param: { id: data.id },
          json: {
            ...publishableSample,
            description: null,
            expectedUpdatedAt: data.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      const kept = await client.admin.samples[":id"].$get(
        { param: { id: data.id } },
        { headers: authHeader },
      );
      expect(await kept.json()).toMatchObject({
        data: {
          description: {
            collectionDate: {
              precision: "day",
              start: "2026-01-01",
              end: "2026-01-01",
            },
          },
        },
      });
      const ok = await client.admin.samples[":id"].$put(
        {
          param: { id: data.id },
          json: {
            ...publishableSample,
            name: "Basalte (revu)",
            expectedUpdatedAt: sampleResponseSchema.parse(await res.json()).data
              .updatedAt,
          },
        },
        { headers: authHeader },
      );
      expect(ok.status).toBe(200);
    },
  );

  describe("published field lock", () => {
    pgTest(
      "ignores a frozen-field change and keeps the stored value",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db).app);
        const data = await createAndPublish(db, client);
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...publishable,
              name: "Renamed basalt",
              material: "rock.igneous.plutonic",
              specificName: "MC-EDIT-1",
              expectedUpdatedAt: data.updatedAt,
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
      "lets a super admin change the frozen fields of a published sample",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db).app);
        const data = await createAndPublish(db, client, publishable, {
          status: "accepted",
          superAdmin: true,
        });
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...igneous,
              name: "Renamed basalt",
              expectedUpdatedAt: data.updatedAt,
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        const edited = sampleResponseSchema.parse(await res.json()).data;
        expect(edited.name).toBe("Renamed basalt");
        expect(edited.material).toBe(igneous.material);
      },
    );

    pgTest(
      "keeps frozen coordinates but persists an editable locality edit",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db).app);
        const data = await createAndPublish(db, client);
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...publishable,
              location: {
                position: { type: "point", longitude: 99, latitude: 10 },
                localityName: "New locality",
              },
              expectedUpdatedAt: data.updatedAt,
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

    const igneous = {
      ...publishable,
      material: "rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic" as const,
    };
    const metamorphic = {
      ...publishable,
      material: "rock.metamorphic.strongly_metamorphosed.gneiss",
      metamorphicFacies: "eclogite" as const,
      metamorphicFabric: "gneissic" as const,
    };

    pgTest(
      "persists a texture edit on a published igneous sample",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db).app);
        const data = await createAndPublish(db, client, igneous);
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...igneous,
              texture: "cumulate",
              expectedUpdatedAt: data.updatedAt,
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
        expect(kept.texture).toBe("cumulate");
      },
    );

    pgTest(
      "rejects with 409 an edit clearing the facies of a published metamorphic sample",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db).app);
        const data = await createAndPublish(db, client, metamorphic);
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...metamorphic,
              metamorphicFacies: null,
              expectedUpdatedAt: data.updatedAt,
            },
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
      "keeps the stored texture, facies and fabric when the payload's material disagrees",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db).app);
        const data = await createAndPublish(db, client, igneous);
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...igneous,
              material: metamorphic.material,
              texture: null,
              metamorphicFacies: "eclogite",
              metamorphicFabric: "gneissic",
              expectedUpdatedAt: data.updatedAt,
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
        expect(kept.metamorphicFabric).toBeNull();
      },
    );

    pgTest(
      "rejects with 409 when the merged result clears a publish requirement",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db).app);
        const data = await createAndPublish(db, client);
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...publishable,
              existenceStatus: null,
              expectedUpdatedAt: data.updatedAt,
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({
          error: "Update would make the published sample unpublishable",
          reason: "unpublishable",
        });
        const re = await client.admin.samples[":id"].$get(
          { param: { id: data.id } },
          { headers: authHeader },
        );
        expect(
          sampleResponseSchema.parse(await re.json()).data.existenceStatus,
        ).toBe("exists");
      },
    );

    pgTest(
      "lets an already-broken published sample be edited without re-blocking it",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db).app);
        const data = await createAndPublish(db, client);
        await db
          .updateTable("sample")
          .set({ material: null })
          .where("id", "=", data.id)
          .execute();
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...publishable,
              existenceStatus: "lost",
              availabilityStatus: "not_available",
              expectedUpdatedAt: data.updatedAt,
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
        expect(
          sampleResponseSchema.parse(await re.json()).data.existenceStatus,
        ).toBe("lost");
      },
    );

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
      const client = testClient(createApp(db).app);
      const data = await createAndPublish(db, client, igneous);
      const res = await client.admin.samples[":id"].$put(
        {
          param: { id: data.id },
          json: { ...publishable, material, expectedUpdatedAt: data.updatedAt },
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
        const client = testClient(createApp(db).app);
        const data = await createAndPublish(db, client, igneous);
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...publishable,
              material: "rock.igneous.plutonic.felsic",
              expectedUpdatedAt: data.updatedAt,
            },
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
        // Arrange
        const client = testClient(createApp(db).app);
        const data = await createAndPublish(db, client);
        await db
          .updateTable("sample")
          .set({ material: "sediment.exogenous_detritic" })
          .where("id", "=", data.id)
          .execute();
        // Act
        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: data.id },
            json: {
              ...publishable,
              material: "sediment.exogenous_detritic.sand.medium_sand",
              expectedUpdatedAt: data.updatedAt,
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
        const client = testClient(createApp(db, { attachmentsDir }).app);
        const data = await createAndPublish(db, client);
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
          {
            param: { id: data.id },
            json: {
              ...publishable,
              attachments: [],
              expectedUpdatedAt: data.updatedAt,
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
        expect(
          sampleResponseSchema.parse(await re.json()).data.attachments,
        ).toEqual([]);
      },
    );
  });

  pgTest("should answer 404 when updating a missing sample", async ({ db }) => {
    // Act
    const res = await testClient(createApp(db).app).admin.samples[":id"].$put(
      {
        param: { id: "01890a5d-ac96-774b-bcce-b302099a8057" },
        json: {
          name: "Grès",
          nature: "rock_powder",
          type: null,
          collectionMethod: null,
          expectedUpdatedAt: new Date(),
        },
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should publish a sample", async ({ db }) => {
    // Arrange
    await provisionUser(db, "test-token", { status: "accepted" });
    const client = testClient(createApp(db).app);
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
            collectionCurator: "Georges Cuvier",
            collectionOrigin: "scientific_expedition",
          },
          repository: { currentArchive: "02feahw73" },
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

  pgTest("should publish a sample straight as withdrawn", async ({ db }) => {
    // Arrange
    const { app } = createApp(db);
    const client = testClient(app);
    const data = await createSample(db, client);
    // Act
    const res = await app.request(
      `/admin/samples/${data.id}/publish?status=withdrawn`,
      { method: "POST", headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    const published = sampleResponseSchema.parse(await res.json()).data;
    expect(published.status).toBe("withdrawn");
    expect(published.igsn).not.toBeNull();
    const publicPage = await client.samples[":igsn"].$get({
      param: { igsn: published.igsn! },
    });
    expect(await publicPage.json()).toMatchObject({
      data: { status: "withdrawn" },
    });
  });

  pgTest.for(["draft", "tombstone"] as const)(
    "should answer 400 when publishing straight as %s",
    async (status, { db }) => {
      // Arrange
      const { app } = createApp(db);
      const client = testClient(app);
      const data = await createSample(db, client);
      // Act
      const res = await app.request(
        `/admin/samples/${data.id}/publish?status=${status}`,
        { method: "POST", headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(400);
    },
  );

  pgTest.for([
    ["no material", { name: "Unclassified draft", material: undefined }],
    ["an internal-node material", { name: "Rock draft", material: "rock" }],
  ] as const)(
    "should answer 409 when publishing a sample with %s",
    async ([, { name, material }], { db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      const client = testClient(createApp(db).app);
      const created = await client.admin.samples.$post(
        { json: { name, nature: "thin_section", type: null, material } },
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
    "should answer 409 when a pending user publishes a complete draft",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "pending" });
      const client = testClient(createApp(db).app);
      const created = await client.admin.samples.$post(
        { json: publishableSample },
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
      const kept = await client.admin.samples[":id"].$get(
        { param: { id: data.id } },
        { headers: authHeader },
      );
      expect(await kept.json()).toMatchObject({
        data: { status: "draft", igsn: null },
      });
    },
  );

  pgTest(
    "should answer 403 when an unverified user updates their published sample",
    async ({ db }) => {
      // Arrange
      const owner = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const client = testClient(createApp(db).app);
      const created = await client.admin.samples.$post(
        { json: publishableSample },
        { headers: authHeader },
      );
      const { data } = sampleResponseSchema.parse(await created.json());
      await client.admin.samples[":id"].publish.$post(
        { param: { id: data.id } },
        { headers: authHeader },
      );
      await db
        .updateTable("user")
        .set({ status: "pending" })
        .where("id", "=", owner.id)
        .execute();
      // Act
      const res = await client.admin.samples[":id"].$put(
        {
          param: { id: data.id },
          json: {
            ...publishableSample,
            name: "Basalte (revu)",
            expectedUpdatedAt: data.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(403);
      const kept = await client.admin.samples[":id"].$get(
        { param: { id: data.id } },
        { headers: authHeader },
      );
      expect(await kept.json()).toMatchObject({
        data: { name: "Basalte du Massif Central" },
      });
    },
  );

  pgTest("should let a pending user save a draft", async ({ db }) => {
    // Arrange
    await provisionUser(db, "test-token", { status: "pending" });
    const client = testClient(createApp(db).app);
    const created = await client.admin.samples.$post(
      { json: publishableSample },
      { headers: authHeader },
    );
    const { data } = sampleResponseSchema.parse(await created.json());
    // Act
    const res = await client.admin.samples[":id"].$put(
      {
        param: { id: data.id },
        json: {
          ...publishableSample,
          name: "Basalte (revu)",
          expectedUpdatedAt: data.updatedAt,
        },
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
  });

  pgTest(
    "should answer 404 when publishing a missing sample",
    async ({ db }) => {
      // Act
      const res = await testClient(createApp(db).app).admin.samples[
        ":id"
      ].publish.$post(
        { param: { id: "01890a5d-ac96-774b-bcce-b302099a8057" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(404);
    },
  );

  describe("status", () => {
    async function arrangePublished(db: Parameters<typeof createApp>[0]) {
      const client = testClient(createApp(db).app);
      return { client, sample: await createAndPublish(db, client) };
    }

    const setStatus = (
      client: Client,
      id: string,
      status: SetSampleStatusBody["status"],
    ) =>
      client.admin.samples[":id"].status.$put(
        { param: { id }, json: { status } },
        { headers: authHeader },
      );

    pgTest(
      "should withdraw then republish a sample, keeping its igsn",
      async ({ db }) => {
        // Arrange
        const { client, sample } = await arrangePublished(db);
        // Act
        const withdrawn = await setStatus(client, sample.id, "withdrawn");
        const republished = await setStatus(client, sample.id, "published");
        // Assert
        expect(withdrawn.status).toBe(200);
        expect(await withdrawn.json()).toMatchObject({
          data: { status: "withdrawn", igsn: sample.igsn },
        });
        expect(republished.status).toBe(200);
        expect(await republished.json()).toMatchObject({
          data: { status: "published", igsn: sample.igsn },
        });
      },
    );

    pgTest(
      "should answer 409 when changing the status of a draft",
      async ({ db }) => {
        // Arrange
        const client = testClient(createApp(db).app);
        const data = await createSample(db, client, publishableSample);
        // Act
        const res = await setStatus(client, data.id, "withdrawn");
        // Assert
        expect(res.status).toBe(409);
      },
    );

    pgTest("should answer 404 for an unknown sample", async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      const client = testClient(createApp(db).app);
      // Act
      const res = await setStatus(
        client,
        "01890a5d-ac96-774b-bcce-b302099a8057",
        "withdrawn",
      );
      // Assert
      expect(res.status).toBe(404);
    });

    pgTest("should reject an unknown status with 400", async ({ db }) => {
      // Arrange
      const { client, sample } = await arrangePublished(db);
      // Act
      const res = await client.admin.samples[":id"].status.$put(
        {
          param: { id: sample.id },
          json: { status: "draft" as "published" },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(400);
    });

    pgTest(
      "should answer 409 when publishing an already published sample",
      async ({ db }) => {
        // Arrange
        const { client, sample } = await arrangePublished(db);
        // Act
        const res = await client.admin.samples[":id"].publish.$post(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(409);
      },
    );
  });

  describe("validation", () => {
    pgTest("should reject an empty name with 400", async ({ db }) => {
      const res = await postSample(createApp(db).app, {
        name: "",
        nature: "rock_powder",
      });
      expect(res.status).toBe(400);
    });

    pgTest.for([
      [
        "a leaf material path and texture",
        {
          material: "rock.igneous.plutonic.felsic.granite",
          texture: "phaneritic",
        },
        {
          material: "rock.igneous.plutonic.felsic.granite",
          texture: "phaneritic",
        },
      ],
      [
        "a metamorphic facies",
        {
          material: "rock.metamorphic.strongly_metamorphosed.gneiss",
          metamorphicFacies: "amphibolite",
        },
        { metamorphicFacies: "amphibolite" },
      ],
    ] as const)(
      "should create a sample with %s",
      async ([, fields, expected], { db }) => {
        const res = await postSample(createApp(db).app, {
          name: "Basalte du Massif Central",
          nature: "thin_section",
          ...fields,
        });
        expect(res.status).toBe(201);
        expect(await res.json()).toMatchObject({ data: expected });
      },
    );

    pgTest.for([
      ["an unknown nature", { nature: "Roche inconnue" }],
      ["an unknown type", { type: "half_round" }],
      ["an unknown collection method", { collectionMethod: "gravity_corer" }],
      ["an unknown material", { material: "lava" }],
    ] as const)("should reject %s with 400", async ([, fields], { db }) => {
      const res = await postSample(createApp(db).app, {
        name: "Basalte du Massif Central",
        nature: "thin_section",
        ...fields,
      });
      expect(res.status).toBe(400);
    });

    pgTest("should reject a malformed sample id with 400", async ({ db }) => {
      const res = await createApp(db).app.request("/admin/samples/not-a-uuid", {
        headers: authHeader,
      });
      expect(res.status).toBe(400);
    });

    pgTest("should reject unknown fields with 400", async ({ db }) => {
      const res = await postSample(createApp(db).app, {
        name: "Grès",
        nature: "rock_powder",
        extra: "x",
      });
      expect(res.status).toBe(400);
    });

    pgTest(
      "should reject a texture inconsistent with the material with 400",
      async ({ db }) => {
        const res = await postSample(createApp(db).app, {
          name: "Basalt",
          nature: "thin_section",
          material: "rock.igneous.volcanic.mafic.basalt",
          texture: "cumulate",
        });
        expect(res.status).toBe(400);
      },
    );

    pgTest(
      "should create a metamorphic sample with no facies",
      async ({ db }) => {
        const client = testClient(createApp(db).app);
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

    pgTest.for([
      ["a facies", { metamorphicFacies: "amphibolite" }],
      ["a fabric", { metamorphicFabric: "schistose" }],
    ] as const)(
      "should reject %s on a non-metamorphic material with 400",
      async ([, fields], { db }) => {
        const res = await postSample(createApp(db).app, {
          name: "Basalt",
          nature: "thin_section",
          material: "rock.igneous.volcanic.mafic.basalt",
          ...fields,
        });
        expect(res.status).toBe(400);
      },
    );

    pgTest("should reject an invalid update body with 400", async ({ db }) => {
      const res = await createApp(db).app.request(
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
    const jsonBody = {
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Grès", nature: "rock_powder" }),
    };

    pgTest.for([
      ["list", "/admin/samples", {}],
      ["get", "/admin/samples/01890a5d-ac96-774b-bcce-b302099a8057", {}],
      ["create", "/admin/samples", { method: "POST", ...jsonBody }],
      [
        "update",
        "/admin/samples/01890a5d-ac96-774b-bcce-b302099a8057",
        { method: "PUT", ...jsonBody },
      ],
      [
        "publish",
        "/admin/samples/01890a5d-ac96-774b-bcce-b302099a8057/publish",
        { method: "POST" },
      ],
    ] as const)(
      "should reject an unauthenticated %s with 401",
      async ([, path, init], { db }) => {
        const res = await createApp(db).app.request(path, init);
        expect(res.status).toBe(401);
      },
    );
  });

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
      const client = testClient(createApp(db).app);
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
        const res = await testClient(createApp(db).app).admin.samples[
          ":id"
        ].$get({ param: { id: sample.id } }, { headers: authHeader });
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
        const res = await testClient(createApp(db).app).admin.samples[
          ":id"
        ].$put(
          {
            param: { id: sample.id },
            json: {
              name: "Stolen granite",
              nature: "rock_powder",
              type: null,
              collectionMethod: null,
              expectedUpdatedAt: sample.updatedAt,
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should let a super admin open another researcher's sample",
      async ({ db }) => {
        // Arrange
        await provisionUser(db, "test-token", {
          status: "accepted",
          superAdmin: true,
        });
        const sample = await insertOtherResearcherSample(db);
        // Act
        const res = await testClient(createApp(db).app).admin.samples[
          ":id"
        ].$get({ param: { id: sample.id } }, { headers: authHeader });
        // Assert
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
          data: { name: "Granite de Pierre" },
          role: "owner",
        });
      },
    );

    pgTest(
      "should let a super admin update another researcher's sample",
      async ({ db }) => {
        // Arrange
        await provisionUser(db, "test-token", {
          status: "accepted",
          superAdmin: true,
        });
        const sample = await insertOtherResearcherSample(db);
        // Act
        const res = await testClient(createApp(db).app).admin.samples[
          ":id"
        ].$put(
          {
            param: { id: sample.id },
            json: {
              name: "Granite relu",
              nature: "rock_powder",
              type: null,
              collectionMethod: null,
              expectedUpdatedAt: sample.updatedAt,
            },
          },
          { headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(200);
        expect(await res.json()).toMatchObject({
          data: { name: "Granite relu" },
        });
      },
    );

    pgTest(
      "should let a super admin share another researcher's sample",
      async ({ db }) => {
        // Arrange
        await provisionUser(db, "test-token", {
          status: "accepted",
          superAdmin: true,
        });
        const sample = await insertOtherResearcherSample(db);
        const colleague = await insertUser(db, "colleague@univ-lorraine.fr");
        const client = testClient(createApp(db).app);
        // Act
        const added = await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );
        // Assert
        expect(added.status).toBe(204);
        const listed = await client.admin.samples[":id"].collaborators.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        const { data } = (await listed.json()) as SampleCollaboratorsResponse;
        expect(
          data
            .map(({ email, role }) => ({ email, role }))
            .sort((a, b) => a.email.localeCompare(b.email)),
        ).toEqual([
          { email: "colleague@univ-lorraine.fr", role: "contributor" },
          { email: "other@univ-lorraine.fr", role: "owner" },
        ]);
      },
    );

    pgTest(
      "should let a super admin remove a contributor from another researcher's sample",
      async ({ db }) => {
        // Arrange
        await provisionUser(db, "test-token", {
          status: "accepted",
          superAdmin: true,
        });
        const sample = await insertOtherResearcherSample(db);
        const colleague = await insertUser(db, "colleague@univ-lorraine.fr");
        const client = testClient(createApp(db).app);
        await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );
        // Act
        const removed = await client.admin.samples[":id"].collaborators[
          ":userId"
        ].$delete(
          { param: { id: sample.id, userId: colleague.id } },
          { headers: authHeader },
        );
        // Assert
        expect(removed.status).toBe(204);
        const listed = await client.admin.samples[":id"].collaborators.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        const { data } = (await listed.json()) as SampleCollaboratorsResponse;
        expect(data.map(({ email, role }) => ({ email, role }))).toEqual([
          { email: "other@univ-lorraine.fr", role: "owner" },
        ]);
      },
    );

    pgTest(
      "should answer 403 when publishing another researcher's sample",
      async ({ db }) => {
        // Arrange
        const sample = await insertOtherResearcherSample(db);
        // Act
        const res = await testClient(createApp(db).app).admin.samples[
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
        const res = await testClient(createApp(db).app).admin.samples[
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
        const res = await createApp(db).app.request(
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
        const res = await createApp(db).app.request(
          `/admin/samples/${sample.id}/attachments/01890a5d-ac96-774b-bcce-b302099a8059`,
          { method: "DELETE", headers: authHeader },
        );
        // Assert
        expect(res.status).toBe(403);
      },
    );

    pgTest("should answer 403 for a sample nobody owns", async ({ db }) => {
      // Arrange
      const sample = await insertSample(db, {
        name: "Orphan granite",
        nature: "rock_powder",
        type: null,
        collectionMethod: null,
      });
      // Act
      const res = await testClient(createApp(db).app).admin.samples[":id"].$get(
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
      { status }: { status: SampleStatus } = { status: "draft" },
    ) {
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const caller = await insertUser(db, authenticatedCallerEmail);
      const sample = await insertSample(db, draft);
      await insertSampleOwner(db, sample.id, owner.id);
      await insertContributor(db, sample.id, caller.id);
      if (status !== "draft") {
        await publishSample(db, sample.id);
      }
      if (status === "withdrawn") {
        await setSampleStatus(db, sample.id, status);
      }
      return sample;
    }

    pgTest(
      "should record the author of a new sample as its owner",
      async ({ db }) => {
        const client = testClient(createApp(db).app);

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
        const client = testClient(createApp(db).app);
        const sample = await shareWithCaller(db);

        const read = await client.admin.samples[":id"].$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        const saved = await client.admin.samples[":id"].$put(
          {
            param: { id: sample.id },
            json: {
              ...draft,
              name: "Basalte relu",
              expectedUpdatedAt: sample.updatedAt,
            },
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
      const client = testClient(createApp(db).app);
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
        data: { status: "draft", igsn: null },
      });
    });

    pgTest.for(["published", "withdrawn"] as const)(
      "should answer 403 when a contributor updates a %s sample",
      async (status, { db }) => {
        const client = testClient(createApp(db).app);
        const sample = await shareWithCaller(db, { status });

        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: sample.id },
            json: {
              ...draft,
              name: "Basalte détourné",
              expectedUpdatedAt: sample.updatedAt,
            },
          },
          { headers: authHeader },
        );

        expect(res.status).toBe(403);
        const kept = await client.admin.samples[":id"].$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        expect(await kept.json()).toMatchObject({
          data: { name: "Basalte partagé", status },
        });
      },
    );

    pgTest(
      "should answer 403 when a contributor changes the status",
      async ({ db }) => {
        const client = testClient(createApp(db).app);
        const sample = await shareWithCaller(db, { status: "published" });

        const res = await client.admin.samples[":id"].status.$put(
          { param: { id: sample.id }, json: { status: "withdrawn" } },
          { headers: authHeader },
        );

        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should answer 403, never name the lock holder, when a contributor updates a published sample another user is editing",
      async ({ db }) => {
        const client = testClient(createApp(db).app);
        const sample = await shareWithCaller(db, { status: "published" });
        const pierre = await insertUser(db, "pierre@univ-lorraine.fr");
        await acquireEditLock(db, sample.id, pierre.id);

        const res = await client.admin.samples[":id"].$put(
          {
            param: { id: sample.id },
            json: { ...draft, expectedUpdatedAt: sample.updatedAt },
          },
          { headers: authHeader },
        );

        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ error: "Forbidden" });
      },
    );

    pgTest(
      "should answer 403 when a contributor uploads to a published sample",
      async ({ db }) => {
        const client = testClient(createApp(db).app);
        const sample = await shareWithCaller(db, { status: "published" });

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
        const sample = await shareWithCaller(db, { status: "published" });

        const res = await createApp(db).app.request(
          `/admin/samples/${sample.id}/attachments/01890a5d-ac96-774b-bcce-b302099a8059`,
          { method: "DELETE", headers: authHeader },
        );

        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should let a contributor upload an attachment to a draft sample",
      async ({ db }) => {
        const client = testClient(createApp(db).app);
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
        const client = testClient(createApp(db).app);
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

        const res = await createApp(db).app.request(
          `/admin/samples/${sample.id}/attachments/${data.id}`,
          { method: "DELETE", headers: authHeader },
        );

        expect(res.status).toBe(204);
      },
    );
  });

  describe("editor authorization", () => {
    const draft = {
      name: "Basalte confié",
      nature: "thin_section" as const,
      type: null,
      collectionMethod: null,
    };
    const colleagueHeader = { Authorization: "Bearer colleague" };

    async function shareWithCallerAsEditor(
      db: Parameters<typeof createApp>[0],
      {
        json = draft,
        status = "draft",
      }: {
        json?: Parameters<typeof insertSample>[1];
        status?: SampleStatus;
      } = {},
    ) {
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      const caller = await insertUser(db, authenticatedCallerEmail);
      const sample = await insertSample(db, json);
      await insertSampleOwner(db, sample.id, owner.id);
      await db
        .insertInto("user_sample")
        .values({ sample_id: sample.id, user_id: caller.id, role: "editor" })
        .execute();
      if (status !== "draft") {
        await publishSample(db, sample.id);
      }
      return sample;
    }

    pgTest("should let an editor publish a sample", async ({ db }) => {
      const client = testClient(createApp(db).app);
      const sample = await shareWithCallerAsEditor(db, {
        json: { ...publishableSample, collectionMethod: null },
      });

      const res = await client.admin.samples[":id"].publish.$post(
        { param: { id: sample.id } },
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const read = await client.admin.samples[":id"].$get(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      expect(await read.json()).toMatchObject({
        data: { status: "published" },
      });
    });

    pgTest(
      "should let an editor invite a collaborator, who gains access",
      async ({ db }) => {
        const client = testClient(createApp(db).app);
        const sample = await shareWithCallerAsEditor(db);
        const colleague = await insertUser(db, "colleague@example.com");

        const added = await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
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
      "should answer 403 when an editor changes a collaborator's role",
      async ({ db }) => {
        const client = testClient(createApp(db).app);
        const sample = await shareWithCallerAsEditor(db);
        const colleague = await insertUser(db, "colleague@example.com");
        await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        const changed = await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "editor" },
          },
          { headers: authHeader },
        );

        expect(changed.status).toBe(403);
        const stored = await db
          .selectFrom("user_sample")
          .select("role")
          .where("sample_id", "=", sample.id)
          .where("user_id", "=", colleague.id)
          .executeTakeFirst();
        expect(stored).toEqual({ role: "contributor" });
      },
    );

    pgTest("should let an editor update a published sample", async ({ db }) => {
      const client = testClient(createApp(db).app);
      const sample = await shareWithCallerAsEditor(db, { status: "published" });
      const read = await client.admin.samples[":id"].$get(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      const { data } = adminSampleResponseSchema.parse(await read.json());

      const saved = await client.admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...draft,
            specificName: "MC-2026-007",
            expectedUpdatedAt: data.updatedAt,
          },
        },
        { headers: authHeader },
      );

      expect(saved.status).toBe(200);
      expect(await saved.json()).toMatchObject({
        data: { id: sample.id, specificName: "MC-2026-007" },
      });
    });

    pgTest("should let an editor list collaborators", async ({ db }) => {
      const client = testClient(createApp(db).app);
      const sample = await shareWithCallerAsEditor(db);

      const res = await client.admin.samples[":id"].collaborators.$get(
        { param: { id: sample.id } },
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
    });

    pgTest(
      "should answer 403 when an editor removes a collaborator",
      async ({ db }) => {
        const client = testClient(createApp(db).app);
        const sample = await shareWithCallerAsEditor(db);
        const colleague = await insertUser(db, "colleague@example.com");
        await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        const res = await client.admin.samples[":id"].collaborators[
          ":userId"
        ].$delete(
          { param: { id: sample.id, userId: colleague.id } },
          { headers: authHeader },
        );

        expect(res.status).toBe(403);
      },
    );
  });

  describe("ownership filter", () => {
    const draft = {
      name: "Owned basalt",
      nature: "thin_section" as const,
      type: null,
      collectionMethod: null,
    };

    pgTest(
      "should leave a sample nobody shared out of a super admin's list",
      async ({ db }) => {
        // Arrange
        await provisionUser(db, "test-token", {
          status: "accepted",
          superAdmin: true,
        });
        const client = testClient(createApp(db).app);
        await client.admin.samples.$post(
          { json: draft },
          { headers: authHeader },
        );
        const other = await insertUser(db, "other@univ-lorraine.fr");
        const foreign = await insertSample(db, {
          name: "Foreign granite",
          nature: "rock_powder",
          type: null,
          collectionMethod: null,
        });
        await insertSampleOwner(db, foreign.id, other.id);
        // Act
        const res = await client.admin.samples.$get(
          { query: { page: "1", perPage: "10" } },
          { headers: authHeader },
        );
        // Assert
        const body = adminListSamplesResponseSchema.parse(await res.json());
        expect(body.data.map((sample) => sample.name)).toEqual([
          "Owned basalt",
        ]);
        expect(body.meta.total).toBe(1);
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
      const client = testClient(createApp(db).app);
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

        const res = await testClient(createApp(db).app).admin.samples.$get(
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
      const client = testClient(createApp(db).app);
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

        const res = await testClient(createApp(db).app).admin.samples[
          ":id"
        ].$get({ param: { id: sample.id } }, { headers: authHeader });

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
    const ADMIN_URL = "http://localhost:3001/admin/";
    const FRONTEND_URL = "http://localhost:3000";

    async function arrangeOwnedSample(
      db: Parameters<typeof createApp>[0],
      mail?: { sendMail: SendMail; adminUrl: string; frontendUrl: string },
    ) {
      const app = createApp(db, { mail }).app;
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
      "should list a sample's collaborators, owner included, for its owner",
      async ({ db }) => {
        const { app, sample, owner, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);
        await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        const res = await client.admin.samples[":id"].collaborators.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
          data: [
            {
              id: owner.id,
              email: authenticatedCallerEmail,
              name: "User",
              firstname: "Test",
              orcid: null,
              role: "owner",
              status: "accepted",
            },
            {
              id: colleague.id,
              email: "colleague@example.com",
              name: null,
              firstname: null,
              orcid: null,
              role: "contributor",
              status: "accepted",
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

        const added = await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
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
        const { app, sample, owner, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);
        await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        const again = await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        expect(again.status).toBe(204);
        const res = await client.admin.samples[":id"].collaborators.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        const { data } = (await res.json()) as SampleCollaboratorsResponse;
        expect(data.map(({ id, role }) => ({ id, role }))).toEqual([
          { id: owner.id, role: "owner" },
          { id: colleague.id, role: "contributor" },
        ]);
      },
    );

    pgTest(
      "should keep the owner sole owner when they add themselves",
      async ({ db }) => {
        const { app, sample, owner } = await arrangeOwnedSample(db);
        const client = testClient(app);

        const res = await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: owner.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        expect(res.status).toBe(204);
        const listed = await client.admin.samples[":id"].collaborators.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        expect(await listed.json()).toEqual({
          data: [
            {
              id: owner.id,
              email: authenticatedCallerEmail,
              name: "User",
              firstname: "Test",
              orcid: null,
              role: "owner",
              status: "accepted",
            },
          ],
        });
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

    pgTest("should add a collaborator as editor", async ({ db }) => {
      const { app, sample, colleague } = await arrangeOwnedSample(db);
      const client = testClient(app);

      const added = await client.admin.samples[":id"].collaborators.$post(
        {
          param: { id: sample.id },
          json: { userId: colleague.id, role: "editor" },
        },
        { headers: authHeader },
      );

      expect(added.status).toBe(204);
      const listed = await client.admin.samples[":id"].collaborators.$get(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      const { data } = (await listed.json()) as SampleCollaboratorsResponse;
      expect(data).toContainEqual(
        expect.objectContaining({ id: colleague.id, role: "editor" }),
      );
    });

    pgTest(
      "should move a collaborator to the role the owner re-invites them with",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);
        await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        const again = await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "editor" },
          },
          { headers: authHeader },
        );

        expect(again.status).toBe(204);
        const listed = await client.admin.samples[":id"].collaborators.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        const { data } = (await listed.json()) as SampleCollaboratorsResponse;
        expect(data).toContainEqual(
          expect.objectContaining({ id: colleague.id, role: "editor" }),
        );
      },
    );

    pgTest.for(["editor", "contributor"] as const)(
      "should let the owner remove the %s",
      async (role, { db }) => {
        const { app, sample, owner, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);
        await client.admin.samples[":id"].collaborators.$post(
          { param: { id: sample.id }, json: { userId: colleague.id, role } },
          { headers: authHeader },
        );

        const removed = await client.admin.samples[":id"].collaborators[
          ":userId"
        ].$delete(
          { param: { id: sample.id, userId: colleague.id } },
          { headers: authHeader },
        );

        expect(removed.status).toBe(204);
        const listed = await client.admin.samples[":id"].collaborators.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        const { data } = (await listed.json()) as SampleCollaboratorsResponse;
        expect(
          data.map(({ id, role: stored }) => ({ id, role: stored })),
        ).toEqual([{ id: owner.id, role: "owner" }]);
        const read = await client.admin.samples[":id"].$get(
          { param: { id: sample.id } },
          { headers: colleagueHeader },
        );
        expect(read.status).toBe(403);
      },
    );

    pgTest("should answer 404 when removing the owner", async ({ db }) => {
      const { app, sample, owner } = await arrangeOwnedSample(db);
      const client = testClient(app);

      const res = await client.admin.samples[":id"].collaborators[
        ":userId"
      ].$delete(
        { param: { id: sample.id, userId: owner.id } },
        { headers: authHeader },
      );

      expect(res.status).toBe(404);
      const rows = await db
        .selectFrom("user_sample")
        .selectAll()
        .where("sample_id", "=", sample.id)
        .execute();
      expect(rows).toEqual([
        { sample_id: sample.id, user_id: owner.id, role: "owner" },
      ]);
    });

    pgTest(
      "should answer 403 when a contributor removes a contributor",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);
        await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        const res = await client.admin.samples[":id"].collaborators[
          ":userId"
        ].$delete(
          { param: { id: sample.id, userId: colleague.id } },
          { headers: colleagueHeader },
        );

        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should reject a removal with a malformed user id with 400",
      async ({ db }) => {
        const { app, sample } = await arrangeOwnedSample(db);

        const res = await app.request(
          `/admin/samples/${sample.id}/collaborators/not-a-uuid`,
          { method: "DELETE", headers: authHeader },
        );

        expect(res.status).toBe(400);
      },
    );

    pgTest(
      "should answer 401 on removal when the session is no longer active",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);
        vi.mocked(requireActiveSession).mockImplementationOnce(async (c) =>
          c.json({ error: "Unauthorized" }, 401),
        );

        const res = await testClient(app).admin.samples[":id"].collaborators[
          ":userId"
        ].$delete(
          { param: { id: sample.id, userId: colleague.id } },
          { headers: authHeader },
        );

        expect(res.status).toBe(401);
      },
    );

    pgTest("should invite an added contributor by mail", async ({ db }) => {
      const sendMail = vi.fn().mockResolvedValue(undefined);
      const { app, sample, colleague } = await arrangeOwnedSample(db, {
        sendMail,
        adminUrl: ADMIN_URL,
        frontendUrl: FRONTEND_URL,
      });

      const res = await testClient(app).admin.samples[
        ":id"
      ].collaborators.$post(
        {
          param: { id: sample.id },
          json: { userId: colleague.id, role: "contributor" },
        },
        { headers: authHeader },
      );

      expect(res.status).toBe(204);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: ["colleague@example.com"],
            subject:
              'Test User invited you to collaborate on "Basalte à partager"',
          }),
        ),
      );
      expect(sendMail.mock.calls[0]?.[0].text).toContain(
        `${ADMIN_URL}samples/${sample.id}`,
      );
    });

    pgTest("should mail the removed collaborator", async ({ db }) => {
      const sendMail = vi.fn().mockResolvedValue(undefined);
      const { app, sample, colleague } = await arrangeOwnedSample(db, {
        sendMail,
        adminUrl: ADMIN_URL,
        frontendUrl: FRONTEND_URL,
      });
      const client = testClient(app);
      await client.admin.samples[":id"].collaborators.$post(
        {
          param: { id: sample.id },
          json: { userId: colleague.id, role: "contributor" },
        },
        { headers: authHeader },
      );
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalled());
      sendMail.mockClear();

      const res = await client.admin.samples[":id"].collaborators[
        ":userId"
      ].$delete(
        { param: { id: sample.id, userId: colleague.id } },
        { headers: authHeader },
      );

      expect(res.status).toBe(204);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: ["colleague@example.com"],
            subject:
              'Test User removed you from the sample "Basalte à partager"',
          }),
        ),
      );
      expect(sendMail.mock.calls[0]?.[0].text).toContain(ADMIN_URL);
    });

    pgTest(
      "should mail the other collaborators, not the deleter, when a draft is deleted",
      async ({ db }) => {
        const sendMail = vi.fn().mockResolvedValue(undefined);
        const { app, sample, colleague } = await arrangeOwnedSample(db, {
          sendMail,
          adminUrl: ADMIN_URL,
          frontendUrl: FRONTEND_URL,
        });
        await testClient(app).admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "editor" },
          },
          { headers: authHeader },
        );
        await vi.waitFor(() => expect(sendMail).toHaveBeenCalled());
        sendMail.mockClear();

        const res = await app.request(`/admin/samples/${sample.id}`, {
          method: "DELETE",
          headers: colleagueHeader,
        });

        expect(res.status).toBe(204);
        await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: [authenticatedCallerEmail],
            subject: 'Test User deleted the draft sample "Basalte à partager"',
          }),
        );
      },
    );

    pgTest(
      "should not mail a removed collaborator whose account is rejected",
      async ({ db }) => {
        const sendMail = vi.fn().mockResolvedValue(undefined);
        const { app, sample, colleague } = await arrangeOwnedSample(db, {
          sendMail,
          adminUrl: ADMIN_URL,
          frontendUrl: FRONTEND_URL,
        });
        const client = testClient(app);
        await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );
        await vi.waitFor(() => expect(sendMail).toHaveBeenCalled());
        sendMail.mockClear();
        await db
          .updateTable("user")
          .set({ status: "rejected" })
          .where("id", "=", colleague.id)
          .execute();

        const res = await client.admin.samples[":id"].collaborators[
          ":userId"
        ].$delete(
          { param: { id: sample.id, userId: colleague.id } },
          { headers: authHeader },
        );

        expect(res.status).toBe(204);
        expect(sendMail).not.toHaveBeenCalled();
      },
    );

    pgTest(
      "should not mail a rejected collaborator when a draft is deleted",
      async ({ db }) => {
        const sendMail = vi.fn().mockResolvedValue(undefined);
        const { app, sample, colleague } = await arrangeOwnedSample(db, {
          sendMail,
          adminUrl: ADMIN_URL,
          frontendUrl: FRONTEND_URL,
        });
        await testClient(app).admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );
        await vi.waitFor(() => expect(sendMail).toHaveBeenCalled());
        sendMail.mockClear();
        await db
          .updateTable("user")
          .set({ status: "rejected" })
          .where("id", "=", colleague.id)
          .execute();

        const res = await app.request(`/admin/samples/${sample.id}`, {
          method: "DELETE",
          headers: authHeader,
        });

        expect(res.status).toBe(204);
        expect(sendMail).not.toHaveBeenCalled();
      },
    );

    pgTest("should not invite a contributor added twice", async ({ db }) => {
      const sendMail = vi.fn().mockResolvedValue(undefined);
      const { app, sample, colleague } = await arrangeOwnedSample(db, {
        sendMail,
        adminUrl: ADMIN_URL,
        frontendUrl: FRONTEND_URL,
      });
      const client = testClient(app);
      await client.admin.samples[":id"].collaborators.$post(
        {
          param: { id: sample.id },
          json: { userId: colleague.id, role: "contributor" },
        },
        { headers: authHeader },
      );
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalled());
      sendMail.mockClear();

      const again = await client.admin.samples[":id"].collaborators.$post(
        {
          param: { id: sample.id },
          json: { userId: colleague.id, role: "contributor" },
        },
        { headers: authHeader },
      );

      expect(again.status).toBe(204);
      expect(sendMail).not.toHaveBeenCalled();
    });

    pgTest(
      "should answer 403 and send no invitation for a rejected invitee",
      async ({ db }) => {
        const sendMail = vi.fn().mockResolvedValue(undefined);
        const { app, sample } = await arrangeOwnedSample(db, {
          sendMail,
          adminUrl: ADMIN_URL,
          frontendUrl: FRONTEND_URL,
        });
        const invitee = await insertUser(db, "invitee@example.com", {
          status: "rejected",
        });

        const res = await testClient(app).admin.samples[
          ":id"
        ].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: invitee.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        expect(res.status).toBe(403);
        expect(sendMail).not.toHaveBeenCalled();
      },
    );

    pgTest("should not invite an unknown user id", async ({ db }) => {
      const sendMail = vi.fn().mockResolvedValue(undefined);
      const { app, sample } = await arrangeOwnedSample(db, {
        sendMail,
        adminUrl: ADMIN_URL,
        frontendUrl: FRONTEND_URL,
      });

      const res = await testClient(app).admin.samples[
        ":id"
      ].collaborators.$post(
        {
          param: { id: sample.id },
          json: {
            userId: "01890a5d-ac96-774b-bcce-b302099a8057",
            role: "contributor",
          },
        },
        { headers: authHeader },
      );

      expect(res.status).toBe(404);
      expect(sendMail).not.toHaveBeenCalled();
    });

    pgTest(
      "should still add the contributor when the invitation cannot be sent",
      async ({ db }) => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        const sendMail = vi.fn().mockRejectedValue(new Error("SMTP down"));
        const { app, sample, colleague } = await arrangeOwnedSample(db, {
          sendMail,
          adminUrl: ADMIN_URL,
          frontendUrl: FRONTEND_URL,
        });
        const client = testClient(app);

        const res = await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        expect(res.status).toBe(204);
        await vi.waitFor(() => expect(logged).toHaveBeenCalled());
        logged.mockRestore();
        const listed = await client.admin.samples[":id"].collaborators.$get(
          { param: { id: sample.id } },
          { headers: authHeader },
        );
        const { data } = (await listed.json()) as SampleCollaboratorsResponse;
        expect(data.map(({ id }) => id)).toContain(colleague.id);
      },
    );

    pgTest("should let a contributor list collaborators", async ({ db }) => {
      const { app, sample, colleague } = await arrangeOwnedSample(db);
      const client = testClient(app);
      await client.admin.samples[":id"].collaborators.$post(
        {
          param: { id: sample.id },
          json: { userId: colleague.id, role: "contributor" },
        },
        { headers: authHeader },
      );

      const res = await client.admin.samples[":id"].collaborators.$get(
        { param: { id: sample.id } },
        { headers: colleagueHeader },
      );

      expect(res.status).toBe(200);
    });

    pgTest.for([
      { case: "adds another contributor", role: "contributor", status: 204 },
      { case: "adds an editor", role: "editor", status: 403 },
    ])(
      "should answer $status when a contributor $case",
      async ({ role, status }, { db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);
        const client = testClient(app);
        await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );
        const stranger = await insertUser(db, "stranger@univ-lorraine.fr");

        const res = await client.admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: stranger.id, role: role as "contributor" },
          },
          { headers: colleagueHeader },
        );

        expect(res.status).toBe(status);
      },
    );

    pgTest(
      "should answer 403 when an unrelated researcher lists contributors",
      async ({ db }) => {
        const { app, sample } = await arrangeOwnedSample(db);

        const res = await testClient(app).admin.samples[
          ":id"
        ].collaborators.$get(
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
        ].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: colleague.id, role: "contributor" },
          },
          { headers: authHeader },
        );

        expect(res.status).toBe(401);
      },
    );

    pgTest("should reject a malformed user id with 400", async ({ db }) => {
      const { app, sample } = await arrangeOwnedSample(db);

      const res = await app.request(
        `/admin/samples/${sample.id}/collaborators`,
        {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeader },
          body: JSON.stringify({ userId: "not-a-uuid", role: "contributor" }),
        },
      );

      expect(res.status).toBe(400);
    });

    pgTest.for([
      { case: "no role", role: undefined },
      { case: "the owner role", role: "owner" },
      { case: "an unknown role", role: "moderator" },
    ])("should reject a body with $case with 400", async ({ role }, { db }) => {
      const { app, sample, owner, colleague } = await arrangeOwnedSample(db);

      const res = await app.request(
        `/admin/samples/${sample.id}/collaborators`,
        {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeader },
          body: JSON.stringify({ userId: colleague.id, role }),
        },
      );

      expect(res.status).toBe(400);
      const rows = await db
        .selectFrom("user_sample")
        .select("user_id")
        .where("sample_id", "=", sample.id)
        .execute();
      expect(rows).toEqual([{ user_id: owner.id }]);
    });

    pgTest(
      "should reject an unauthenticated contributor add with 401",
      async ({ db }) => {
        const { app, sample, colleague } = await arrangeOwnedSample(db);

        const res = await app.request(
          `/admin/samples/${sample.id}/collaborators`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              userId: colleague.id,
              role: "contributor",
            }),
          },
        );

        expect(res.status).toBe(401);
      },
    );
  });

  describe("delete a sample", () => {
    const UNKNOWN_ID = "01890a5d-ac96-774b-bcce-b302099a8060";
    const IN_REACH = "UMR7358";
    const GROUP = {
      id: "01890a5d-ac96-774b-bcce-b302099a9001",
      name: "Massif Central 2026",
    };

    async function arrangeDeletableSample(
      db: Parameters<typeof createApp>[0],
      {
        role = "owner",
        status = "draft",
      }: {
        role?: "owner" | "contributor" | "moderator";
        status?: SampleStatus;
      } = {},
    ) {
      const caller = await insertUser(db, authenticatedCallerEmail);
      const owner =
        role === "owner"
          ? caller
          : await insertUser(db, "owner@univ-lorraine.fr");
      const sample = await insertSample(db, draft, {
        institutionalOrganization: null,
        institutionalOsu: null,
        institutionalLaboratory: role === "moderator" ? IN_REACH : null,
      });
      await insertSampleOwner(db, sample.id, owner.id);
      if (role === "contributor") {
        await db
          .insertInto("user_sample")
          .values({ sample_id: sample.id, user_id: caller.id, role })
          .execute();
      }
      if (role === "moderator") {
        await moderateInstitution(db, caller.id, {
          kind: "laboratory",
          code: IN_REACH,
        });
      }
      if (status !== "draft") {
        await publishSample(db, sample.id);
        await setSampleStatus(db, sample.id, status);
      }
      return { caller, sample };
    }

    const deleteSample = (
      app: ReturnType<typeof createApp>["app"],
      id: string,
    ) =>
      app.request(`/admin/samples/${id}`, {
        method: "DELETE",
        headers: authHeader,
      });

    pgTest("should let the owner delete a draft sample", async ({ db }) => {
      const { sample } = await arrangeDeletableSample(db);

      const res = await deleteSample(createApp(db).app, sample.id);

      expect(res.status).toBe(204);
      expect(await readSample(db, sample.id)).toBeNull();
    });

    pgTest(
      "should leave no attachment, relation, collaborator, group or lock row behind, nor its stored files",
      async ({ db }) => {
        const app = createApp(db, { attachmentsDir }).app;
        const { caller, sample } = await arrangeDeletableSample(db);
        const form = new FormData();
        form.set("file", new File(["1,2\n"], "m.csv", { type: "text/csv" }));
        await app.request(`/admin/samples/${sample.id}/attachments`, {
          method: "POST",
          headers: authHeader,
          body: form,
        });
        await db
          .insertInto("sample_relation")
          .values({
            id: crypto.randomUUID(),
            sample_id: sample.id,
            relation_type: "other",
            identifier_type: "doi",
            identifier: "https://doi.org/10.1234/basalte",
            target_title: "Basalte dataset",
          })
          .execute();
        await db.insertInto("manual_group").values(GROUP).execute();
        await attachGroup(db, sample.id, GROUP.id);
        await acquireEditLock(db, sample.id, caller.id);

        const res = await deleteSample(app, sample.id);

        expect(res.status).toBe(204);
        expect({
          attachments: await db
            .selectFrom("sample_attachment")
            .select("id")
            .where("sample_id", "=", sample.id)
            .execute(),
          relations: await db
            .selectFrom("sample_relation")
            .select("id")
            .where("sample_id", "=", sample.id)
            .execute(),
          collaborators: await db
            .selectFrom("user_sample")
            .select("user_id")
            .where("sample_id", "=", sample.id)
            .execute(),
          groups: await db
            .selectFrom("sample_manual_group")
            .select("group_id")
            .where("sample_id", "=", sample.id)
            .execute(),
          locks: await db
            .selectFrom("sample_edit_lock")
            .select("user_id")
            .where("sample_id", "=", sample.id)
            .execute(),
        }).toEqual({
          attachments: [],
          relations: [],
          collaborators: [],
          groups: [],
          locks: [],
        });
        expect(existsSync(join(attachmentsDir, sample.id))).toBe(false);
      },
    );

    pgTest.for([
      {
        case: "a contributor deletes a draft sample",
        role: "contributor" as const,
        status: "draft" as const,
      },
      {
        case: "the owner deletes a published sample",
        role: "owner" as const,
        status: "published" as const,
      },
      {
        case: "the owner deletes a withdrawn sample",
        role: "owner" as const,
        status: "withdrawn" as const,
      },
    ])("should answer 403 when $case", async ({ role, status }, { db }) => {
      const { sample } = await arrangeDeletableSample(db, { role, status });

      const res = await deleteSample(createApp(db).app, sample.id);

      expect(res.status).toBe(403);
      expect(await readSample(db, sample.id)).not.toBeNull();
    });

    pgTest(
      "should let a moderator in reach delete a draft sample they do not collaborate on",
      async ({ db }) => {
        const { sample } = await arrangeDeletableSample(db, {
          role: "moderator",
        });

        const res = await deleteSample(createApp(db).app, sample.id);

        expect(res.status).toBe(204);
        expect(await readSample(db, sample.id)).toBeNull();
      },
    );

    pgTest("should answer 404 for an unknown sample", async ({ db }) => {
      await insertUser(db, authenticatedCallerEmail);

      const res = await deleteSample(createApp(db).app, UNKNOWN_ID);

      expect(res.status).toBe(404);
    });

    pgTest(
      "should answer 401 when the session is no longer active",
      async ({ db }) => {
        const { sample } = await arrangeDeletableSample(db);
        vi.mocked(requireActiveSession).mockImplementationOnce(async (c) =>
          c.json({ error: "Unauthorized" }, 401),
        );

        const res = await deleteSample(createApp(db).app, sample.id);

        expect(res.status).toBe(401);
        expect(await readSample(db, sample.id)).not.toBeNull();
      },
    );

    pgTest(
      "should answer 409 when another collaborator holds the edit lock",
      async ({ db }) => {
        const { sample } = await arrangeDeletableSample(db);
        const pierre = await insertUser(db, "pierre@univ-lorraine.fr");
        await acquireEditLock(db, sample.id, pierre.id);

        const res = await deleteSample(createApp(db).app, sample.id);

        expect(res.status).toBe(409);
        expect(await readSample(db, sample.id)).not.toBeNull();
      },
    );
  });
});
