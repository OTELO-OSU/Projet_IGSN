import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";
import type { Kysely } from "kysely";

import {
  adminListSamplesResponseSchema,
  adminSampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { createApp } from "../app.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { moderateManualGroup } from "../tests/moderate-manual-group.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import {
  attachGroup,
  draft,
  publishableSample,
} from "../tests/sample-fixtures.ts";
import { insertSampleCollaborator } from "../user-sample/insert-sample-collaborator.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";
import { setSampleStatus } from "./service/set-sample-status.ts";

type Db = Kysely<DB>;

const authHeader = { Authorization: "Bearer test-token" };
const ownerHeader = { Authorization: "Bearer owner" };
const ADMIN_URL = "https://admin.example.test/admin/";
const FRONTEND_URL = "http://localhost:3000";

const IN_REACH = "UMR7358";
const OUT_OF_REACH = "UMR5275";
const MANAGED_OSU = { kind: "osu" as const, code: "OTELo" };
const MANAGED_GROUP = {
  id: "01890a5d-ac96-774b-bcce-b302099a9001",
  name: "Massif Central 2026",
};

const REQUESTED_ORGANIZATION = "04vfs2w97";
const CO_TUTELLE_ORGANIZATION = "02feahw73";
const OTHER_ORGANIZATION = "02rx3b187";

const groups = (
  laboratory: string | null,
  organization: string | null = null,
) => ({
  institutionalOrganization: organization,
  institutionalOsu: null,
  institutionalLaboratory: laboratory,
});

async function ownedSample(
  db: Db,
  ownerId: string,
  input: CreateSample,
  laboratory: string | null = null,
  organization: string | null = null,
) {
  const sample = await insertSample(
    db,
    input,
    groups(laboratory, organization),
  );
  await insertSampleOwner(db, sample.id, ownerId);
  return sample;
}

async function arrangeManager(
  db: Db,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  const manager = await provisionUser(db, "test-token", { status: "accepted" });
  await moderateInstitution(db, manager.id, MANAGED_OSU);
  const owner = await insertUser(db, "owner@example.com", {
    name: "Hutton",
    firstname: "James",
  });
  return {
    app: createApp(db, {
      mail: mail && { ...mail, frontendUrl: FRONTEND_URL },
    }).app,
    manager,
    owner,
  };
}

type App = ReturnType<typeof createApp>["app"];

const listModerated = (app: App, filter = "") =>
  app.request(`/admin/samples/moderated?page=1&perPage=25${filter}`, {
    headers: authHeader,
  });

async function arrangeSuperAdmin(db: Db) {
  await provisionUser(db, "test-token", {
    status: "accepted",
    superAdmin: true,
  });
  return createApp(db).app;
}

async function listedIds(res: Response) {
  const { data, meta } = adminListSamplesResponseSchema.parse(await res.json());
  return { ids: data.map((sample) => sample.id), total: meta.total };
}

describe("moderated sample list", () => {
  pgTest(
    "should list the samples the caller's institutional and manual-group reach covers",
    async ({ db }) => {
      // Arrange
      const { app, manager, owner } = await arrangeManager(db);
      await db.insertInto("manual_group").values(MANAGED_GROUP).execute();
      await moderateManualGroup(db, manager.id, [MANAGED_GROUP.id]);
      await ownedSample(
        db,
        owner.id,
        { ...draft, name: "In the managed laboratory" },
        IN_REACH,
      );
      const grouped = await ownedSample(
        db,
        owner.id,
        { ...draft, name: "In the managed group" },
        OUT_OF_REACH,
      );
      await attachGroup(db, grouped.id, MANAGED_GROUP.id);
      await ownedSample(
        db,
        owner.id,
        { ...draft, name: "Out of reach" },
        OUT_OF_REACH,
      );
      // Act
      const res = await listModerated(app);
      // Assert
      expect(res.status).toBe(200);
      const { data, meta } = adminListSamplesResponseSchema.parse(
        await res.json(),
      );
      expect(meta.total).toBe(2);
      expect(data.map((sample) => sample.name).sort()).toEqual([
        "In the managed group",
        "In the managed laboratory",
      ]);
    },
  );

  pgTest(
    "should list every sample for a super admin, whatever its groups",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", {
        status: "accepted",
        superAdmin: true,
      });
      const owner = await insertUser(db, "owner@example.com");
      await ownedSample(
        db,
        owner.id,
        { ...draft, name: "In a laboratory" },
        OUT_OF_REACH,
      );
      await ownedSample(db, owner.id, { ...draft, name: "In no group" });
      // Act
      const res = await listModerated(createApp(db).app);
      // Assert
      expect(res.status).toBe(200);
      const { data, meta } = adminListSamplesResponseSchema.parse(
        await res.json(),
      );
      expect(meta.total).toBe(2);
      expect(data.map((sample) => sample.name).sort()).toEqual([
        "In a laboratory",
        "In no group",
      ]);
    },
  );

  pgTest("should report the owner's status", async ({ db }) => {
    // Arrange
    const { app, owner } = await arrangeManager(db);
    await db
      .updateTable("user")
      .set({ status: "pending" })
      .where("id", "=", owner.id)
      .execute();
    await ownedSample(db, owner.id, draft, IN_REACH);
    // Act
    const res = await listModerated(app);
    // Assert
    const { data } = adminListSamplesResponseSchema.parse(await res.json());
    expect(data[0]?.owner).toEqual({
      name: "Hutton",
      firstname: "James",
      status: "pending",
    });
  });

  pgTest(
    "should ignore the ownership filter, the moderated list being nobody's assignment",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeManager(db);
      await ownedSample(db, owner.id, draft, IN_REACH);
      // Act
      const res = await app.request(
        "/admin/samples/moderated?page=1&perPage=25&ownership=mine",
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        adminListSamplesResponseSchema.parse(await res.json()).meta.total,
      ).toBe(1);
    },
  );

  pgTest("should answer 403 to a caller managing nothing", async ({ db }) => {
    // Arrange
    await provisionUser(db, "test-token", { status: "accepted" });
    // Act
    const res = await listModerated(createApp(db).app);
    // Assert
    expect(res.status).toBe(403);
  });
});

describe("filters on the moderated sample list", () => {
  pgTest(
    "should keep only the samples the requested user owns",
    async ({ db }) => {
      // Arrange
      const app = await arrangeSuperAdmin(db);
      const hutton = await insertUser(db, "hutton@example.com");
      const lyell = await insertUser(db, "lyell@example.com");
      const owned = await ownedSample(db, hutton.id, {
        ...draft,
        name: "Owned by Hutton",
      });
      const shared = await ownedSample(db, lyell.id, {
        ...draft,
        name: "Owned by Lyell",
      });
      await insertSampleCollaborator(db, shared.id, hutton.id, "editor");
      // Act
      const res = await listModerated(app, `&ownerId=${hutton.id}`);
      // Assert
      expect(res.status).toBe(200);
      expect(await listedIds(res)).toEqual({ ids: [owned.id], total: 1 });
    },
  );

  pgTest(
    "should keep only the samples linked to the requested manual group",
    async ({ db }) => {
      // Arrange
      const app = await arrangeSuperAdmin(db);
      const owner = await insertUser(db, "owner@example.com");
      await db.insertInto("manual_group").values(MANAGED_GROUP).execute();
      const grouped = await ownedSample(db, owner.id, {
        ...draft,
        name: "In the group",
      });
      await attachGroup(db, grouped.id, MANAGED_GROUP.id);
      await ownedSample(db, owner.id, { ...draft, name: "In no group" });
      // Act
      const res = await listModerated(app, `&manualGroup=${MANAGED_GROUP.id}`);
      // Assert
      expect(res.status).toBe(200);
      expect(await listedIds(res)).toEqual({ ids: [grouped.id], total: 1 });
    },
  );

  pgTest(
    "should keep a sample whose laboratory belongs to the requested organisme though it snapshotted another co-tutelle organisme",
    async ({ db }) => {
      // Arrange
      const app = await arrangeSuperAdmin(db);
      const owner = await insertUser(db, "owner@example.com");
      const cotutelle = await ownedSample(
        db,
        owner.id,
        { ...draft, name: "Co-tutelle laboratory" },
        IN_REACH,
        CO_TUTELLE_ORGANIZATION,
      );
      await ownedSample(
        db,
        owner.id,
        { ...draft, name: "Another organisme" },
        OUT_OF_REACH,
        OTHER_ORGANIZATION,
      );
      // Act
      const res = await listModerated(
        app,
        `&institution=organization:${REQUESTED_ORGANIZATION}`,
      );
      // Assert
      expect(res.status).toBe(200);
      expect(await listedIds(res)).toEqual({ ids: [cotutelle.id], total: 1 });
    },
  );

  pgTest(
    "should keep only the published samples when the status filter asks for them",
    async ({ db }) => {
      // Arrange
      const app = await arrangeSuperAdmin(db);
      const owner = await insertUser(db, "owner@example.com");
      const published = await ownedSample(db, owner.id, {
        ...draft,
        name: "Published",
      });
      await db
        .updateTable("sample")
        .set({ igsn: "01K072TVWVFK5A1RRZ5MY4PPK9", status: "published" })
        .where("id", "=", published.id)
        .execute();
      await ownedSample(db, owner.id, { ...draft, name: "Still a draft" });
      // Act
      const res = await listModerated(app, "&status=published");
      // Assert
      expect(res.status).toBe(200);
      expect(await listedIds(res)).toEqual({ ids: [published.id], total: 1 });
    },
  );

  pgTest(
    "should keep a filtered list inside the caller's moderation scope",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeManager(db);
      const inReach = await ownedSample(
        db,
        owner.id,
        { ...draft, name: "In reach" },
        IN_REACH,
      );
      await ownedSample(
        db,
        owner.id,
        { ...draft, name: "Out of reach" },
        OUT_OF_REACH,
      );
      // Act
      const res = await listModerated(app, `&ownerId=${owner.id}`);
      // Assert
      expect(res.status).toBe(200);
      expect(await listedIds(res)).toEqual({ ids: [inReach.id], total: 1 });
    },
  );
});

describe("access to a moderated sample", () => {
  pgTest("should read a moderated sample as its editor", async ({ db }) => {
    // Arrange
    const { app, owner } = await arrangeManager(db);
    const sample = await ownedSample(db, owner.id, draft, IN_REACH);
    // Act
    const res = await testClient(app).admin.samples[":id"].$get(
      { param: { id: sample.id } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(adminSampleResponseSchema.parse(await res.json())).toMatchObject({
      data: { id: sample.id },
      role: "editor",
    });
  });

  pgTest("should answer 403 for a sample out of reach", async ({ db }) => {
    // Arrange
    const { app, owner } = await arrangeManager(db);
    const sample = await ownedSample(db, owner.id, draft, OUT_OF_REACH);
    // Act
    const res = await testClient(app).admin.samples[":id"].$get(
      { param: { id: sample.id } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(403);
  });

  pgTest("should update a moderated sample", async ({ db }) => {
    // Arrange
    const { app, owner } = await arrangeManager(db);
    const sample = await ownedSample(db, owner.id, draft, IN_REACH);
    // Act
    const res = await testClient(app).admin.samples[":id"].$put(
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
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: { name: "Basalte relu" },
    });
  });

  pgTest(
    "should answer 403 when the moderator changes the manual groups",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeManager(db);
      await db.insertInto("manual_group").values(MANAGED_GROUP).execute();
      const sample = await ownedSample(db, owner.id, draft, IN_REACH);
      // Act
      const res = await testClient(app).admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...draft,
            manualGroupIds: [MANAGED_GROUP.id],
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
    "should moderate a sample the caller also holds a weaker share on",
    async ({ db }) => {
      // Arrange
      const { app, manager, owner } = await arrangeManager(db);
      const sample = await ownedSample(
        db,
        owner.id,
        publishableSample,
        IN_REACH,
      );
      await insertSampleCollaborator(db, sample.id, manager.id, "contributor");
      // Act
      const res = await testClient(app).admin.samples[":id"].publish.$post(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
    },
  );

  pgTest(
    "should answer 403 when a moderator adds a collaborator",
    async ({ db }) => {
      // Arrange
      const { app, owner } = await arrangeManager(db);
      const invitee = await insertUser(db, "invitee@example.com");
      const sample = await ownedSample(db, owner.id, draft, IN_REACH);
      // Act
      const res = await testClient(app).admin.samples[
        ":id"
      ].collaborators.$post(
        {
          param: { id: sample.id },
          json: { userId: invitee.id, role: "editor" },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(403);
    },
  );
});

describe("the moderation mail", () => {
  pgTest("should mail the owner the fields changed", async ({ db }) => {
    // Arrange
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const { app, owner } = await arrangeManager(db, {
      sendMail,
      adminUrl: ADMIN_URL,
    });
    const sample = await ownedSample(db, owner.id, draft, IN_REACH);
    // Act
    const res = await testClient(app).admin.samples[":id"].$put(
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
    // Assert
    expect(res.status).toBe(200);
    await vi.waitFor(() =>
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["owner@example.com"] }),
      ),
    );
    expect(sendMail.mock.calls[0]?.[0].text).toContain("Name");
    expect(sendMail.mock.calls[0]?.[0].text).toContain(
      `${ADMIN_URL}samples/${sample.id}`,
    );
  });

  pgTest("should mail the owner on a moderated publish", async ({ db }) => {
    // Arrange
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const { app, owner } = await arrangeManager(db, {
      sendMail,
      adminUrl: ADMIN_URL,
    });
    const sample = await ownedSample(db, owner.id, publishableSample, IN_REACH);
    // Act
    const res = await testClient(app).admin.samples[":id"].publish.$post(
      { param: { id: sample.id } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    await vi.waitFor(() =>
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["owner@example.com"],
          subject: expect.stringContaining("published"),
        }),
      ),
    );
  });

  pgTest(
    "should mail the owner on a moderated publish as withdrawn",
    async ({ db }) => {
      // Arrange
      const sendMail = vi.fn().mockResolvedValue(undefined);
      const { app, owner } = await arrangeManager(db, {
        sendMail,
        adminUrl: ADMIN_URL,
      });
      const sample = await ownedSample(
        db,
        owner.id,
        publishableSample,
        IN_REACH,
      );
      // Act
      const res = await app.request(
        `/admin/samples/${sample.id}/publish?status=withdrawn`,
        { method: "POST", headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: ["owner@example.com"],
            subject: expect.stringContaining("published as withdrawn"),
          }),
        ),
      );
      expect(sendMail.mock.calls[0]?.[0].text).toContain("out of public view");
    },
  );

  pgTest(
    "should mail the owner when a super admin edits a sample it does not own",
    async ({ db }) => {
      // Arrange
      const sendMail = vi.fn().mockResolvedValue(undefined);
      await provisionUser(db, "test-token", {
        status: "accepted",
        superAdmin: true,
      });
      const owner = await insertUser(db, "owner@example.com");
      const app = createApp(db, {
        mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
      }).app;
      const sample = await ownedSample(db, owner.id, draft);
      // Act
      const res = await testClient(app).admin.samples[":id"].$put(
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
      // Assert
      expect(res.status).toBe(200);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({ to: ["owner@example.com"] }),
        ),
      );
    },
  );

  pgTest("should mail nobody when the owner edits", async ({ db }) => {
    // Arrange
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const owner = await provisionUser(db, "owner", { status: "accepted" });
    const app = createApp(db, {
      mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
    }).app;
    const sample = await ownedSample(db, owner.id, draft, IN_REACH);
    // Act
    const res = await testClient(app).admin.samples[":id"].$put(
      {
        param: { id: sample.id },
        json: {
          ...draft,
          name: "Basalte relu",
          expectedUpdatedAt: sample.updatedAt,
        },
      },
      { headers: ownerHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest(
    "should mail nobody when no compared field changed",
    async ({ db }) => {
      // Arrange
      const sendMail = vi.fn().mockResolvedValue(undefined);
      const { app, owner } = await arrangeManager(db, {
        sendMail,
        adminUrl: ADMIN_URL,
      });
      const sample = await ownedSample(db, owner.id, draft, IN_REACH);
      // Act
      const res = await testClient(app).admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...draft,
            expectedUpdatedAt: sample.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(sendMail).not.toHaveBeenCalled();
    },
  );
});

describe("a tombstoned sample", () => {
  const setStatus = (
    app: App,
    id: string,
    status: SetSampleStatusBody["status"],
    headers: Record<string, string> = authHeader,
  ) =>
    testClient(app).admin.samples[":id"].status.$put(
      { param: { id }, json: { status } },
      { headers },
    );

  async function arrangeManaged(
    db: Db,
    status: SetSampleStatusBody["status"] = "published",
  ) {
    const { app, owner } = await arrangeManager(db);
    const created = await ownedSample(
      db,
      owner.id,
      publishableSample,
      IN_REACH,
    );
    await publishSample(db, created.id);
    const sample = await setSampleStatus(db, created.id, status);
    return { app, owner, sample: sample! };
  }

  pgTest(
    "should let a manager tombstone a published sample",
    async ({ db }) => {
      // Arrange
      const { app, sample } = await arrangeManaged(db);
      // Act
      const res = await setStatus(app, sample.id, "tombstone");
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ data: { status: "tombstone" } });
    },
  );

  pgTest(
    "should answer 403 when an owner with no management reach tombstones",
    async ({ db }) => {
      // Arrange
      const { app, sample } = await arrangeManaged(db);
      // Act
      const res = await setStatus(app, sample.id, "tombstone", ownerHeader);
      // Assert
      expect(res.status).toBe(403);
    },
  );

  pgTest.for(["published", "withdrawn"] as const)(
    "should let a manager restore a tombstoned sample as %s",
    async (status, { db }) => {
      // Arrange
      const { app, sample } = await arrangeManaged(db, "tombstone");
      // Act
      const res = await setStatus(app, sample.id, status);
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ data: { status } });
    },
  );

  pgTest("should answer 404 to a caller out of reach", async ({ db }) => {
    // Arrange
    const { app, sample } = await arrangeManaged(db, "tombstone");
    // Act
    const res = await testClient(app).admin.samples[":id"].$get(
      { param: { id: sample.id } },
      { headers: ownerHeader },
    );
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should stay in the moderation list", async ({ db }) => {
    // Arrange
    const { app, sample } = await arrangeManaged(db, "tombstone");
    // Act
    const res = await listModerated(app);
    // Assert
    expect(res.status).toBe(200);
    expect(await listedIds(res)).toEqual({ ids: [sample.id], total: 1 });
  });

  pgTest.for([
    [
      "an update",
      (app: App, sample: Sample) =>
        testClient(app).admin.samples[":id"].$put(
          {
            param: { id: sample.id },
            json: {
              ...publishableSample,
              expectedUpdatedAt: sample.updatedAt,
            },
          },
          { headers: authHeader },
        ),
    ],
    [
      "a collaborator invitation",
      (app: App, sample: Sample, inviteeId: string) =>
        testClient(app).admin.samples[":id"].collaborators.$post(
          {
            param: { id: sample.id },
            json: { userId: inviteeId, role: "editor" },
          },
          { headers: authHeader },
        ),
    ],
  ] as const)(
    "should answer 409 to %s from a manager",
    async ([, write], { db }) => {
      // Arrange
      const { app, sample } = await arrangeManaged(db, "tombstone");
      const invitee = await insertUser(db, "invitee@example.com");
      // Act
      const res = await write(app, sample, invitee.id);
      // Assert
      expect(res.status).toBe(409);
    },
  );

  pgTest(
    "should keep the owner role of an owner who manages their own sample",
    async ({ db }) => {
      // Arrange
      const { app, manager } = await arrangeManager(db);
      const sample = await ownedSample(
        db,
        manager.id,
        publishableSample,
        IN_REACH,
      );
      // Act
      const res = await testClient(app).admin.samples[":id"].$get(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(adminSampleResponseSchema.parse(await res.json())).toMatchObject({
        managed: true,
        role: "owner",
      });
    },
  );

  pgTest.for([
    ["an in-reach manager", authHeader, true],
    ["an owner with no management reach", ownerHeader, false],
  ] as const)(
    "should report the management reach of %s",
    async ([, headers, managed], { db }) => {
      // Arrange
      const { app, sample } = await arrangeManaged(db);
      // Act
      const res = await testClient(app).admin.samples[":id"].$get(
        { param: { id: sample.id } },
        { headers },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(adminSampleResponseSchema.parse(await res.json())).toMatchObject({
        managed,
      });
    },
  );
});
