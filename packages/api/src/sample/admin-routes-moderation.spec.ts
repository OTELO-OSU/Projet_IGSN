import type { CreateSample } from "@projet-igsn/domain/sample/sample";
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

type Db = Kysely<DB>;

const authHeader = { Authorization: "Bearer test-token" };
const ownerHeader = { Authorization: "Bearer owner" };
const ADMIN_URL = "https://admin.example.test/";
const FRONTEND_URL = "http://localhost:3000";

const IN_REACH = "UMR7358";
const OUT_OF_REACH = "UMR5275";
const MANAGED_OSU = { kind: "osu" as const, code: "OTELo" };
const MANAGED_GROUP = {
  id: "01890a5d-ac96-774b-bcce-b302099a9001",
  name: "Massif Central 2026",
};

const groups = (laboratory: string | null) => ({
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: laboratory,
});

async function ownedSample(
  db: Db,
  ownerId: string,
  input: CreateSample,
  laboratory: string | null = null,
) {
  const sample = await insertSample(db, input, groups(laboratory));
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

const listModerated = (app: ReturnType<typeof createApp>["app"]) =>
  app.request("/admin/samples/moderated?page=1&perPage=25", {
    headers: authHeader,
  });

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
