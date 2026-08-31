import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { Kysely } from "kysely";

import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { createApp } from "../app.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";

type Db = Kysely<DB>;

const ADMIN_URL = "http://localhost:3001/admin/";
const FRONTEND_URL = "http://localhost:3000";

const authHeader = { Authorization: "Bearer test-token" };
const UNKNOWN_ID = "01890a5d-ac96-774b-bcce-b302099a9999";
const REASON = "The sample was destroyed during a failed analysis.";

function arrangeApp(db: Db) {
  const sendMail = vi.fn<SendMail>().mockResolvedValue(undefined);
  const { app } = createApp(db, {
    mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
  });
  const request = (id: string, json: unknown = { reason: REASON }) =>
    testClient(app).admin.samples[":id"]["deletion-request"].$post(
      { param: { id }, json: json as { reason: string } },
      { headers: authHeader },
    );
  return { app, sendMail, request };
}

const insertSuperAdmins = (db: Db) =>
  Promise.all([
    insertUser(db, "root@univ-lorraine.fr", { superAdmin: true }),
    insertUser(db, "boss@univ-lorraine.fr", { superAdmin: true }),
  ]);

async function arrangeOwnedSample(
  db: Db,
  {
    published = true,
    callerRole = "owner" as UserSampleRole | null,
    superAdmin = false,
  } = {},
): Promise<Sample> {
  const caller = await provisionUser(db, "test-token", {
    status: "accepted",
    superAdmin,
  });
  const created = await insertSample(db, publishableSample);
  if (callerRole === "owner") {
    await insertSampleOwner(db, created.id, caller.id);
  } else {
    const owner = await insertUser(db, "owner@univ-lorraine.fr");
    await insertSampleOwner(db, created.id, owner.id);
    if (callerRole) {
      await db
        .insertInto("user_sample")
        .values({
          sample_id: created.id,
          user_id: caller.id,
          role: callerRole,
        })
        .execute();
    }
  }
  return published ? (await publishSample(db, created.id))! : created;
}

describe("POST /admin/samples/:id/deletion-request", () => {
  pgTest(
    "should mail every super admin the sample link, its IGSN and the justification",
    async ({ db }) => {
      // Arrange
      await insertSuperAdmins(db);
      const { sendMail, request } = arrangeApp(db);
      const sample = await arrangeOwnedSample(db);
      // Act
      const res = await request(sample.id);
      // Assert
      expect(res.status).toBe(204);
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
      const sent = sendMail.mock.lastCall![0];
      expect(sent.to).toEqual([
        "boss@univ-lorraine.fr",
        "root@univ-lorraine.fr",
      ]);
      expect(sent.audience).toBe("admin");
      expect(sent.text).toContain(sample.igsn);
      expect(sent.text).toContain(`${ADMIN_URL}samples/${sample.id}`);
      expect(sent.text).toContain(REASON);
    },
  );

  pgTest("should answer 400 on a blank justification", async ({ db }) => {
    // Arrange
    await insertSuperAdmins(db);
    const { sendMail, request } = arrangeApp(db);
    const sample = await arrangeOwnedSample(db);
    // Act
    const res = await request(sample.id, { reason: "   " });
    // Assert
    expect(res.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest("should answer 401 to an unauthenticated caller", async ({ db }) => {
    // Arrange
    const { app } = arrangeApp(db);
    const sample = await arrangeOwnedSample(db);
    // Act
    const res = await app.request(
      `/admin/samples/${sample.id}/deletion-request`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: REASON }),
      },
    );
    // Assert
    expect(res.status).toBe(401);
  });

  pgTest.for([["editor"], ["contributor"]] as const)(
    "should answer 403 to a %s who does not own the sample",
    async ([callerRole], { db }) => {
      // Arrange
      await insertSuperAdmins(db);
      const { sendMail, request } = arrangeApp(db);
      const sample = await arrangeOwnedSample(db, { callerRole });
      // Act
      const res = await request(sample.id);
      // Assert
      expect(res.status).toBe(403);
      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  pgTest(
    "should answer 403 to a super admin who does not own the sample",
    async ({ db }) => {
      // Arrange
      await insertSuperAdmins(db);
      const { sendMail, request } = arrangeApp(db);
      const sample = await arrangeOwnedSample(db, {
        callerRole: null,
        superAdmin: true,
      });
      // Act
      const res = await request(sample.id);
      // Assert
      expect(res.status).toBe(403);
      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  pgTest("should answer 403 to the owner of a draft", async ({ db }) => {
    // Arrange
    await insertSuperAdmins(db);
    const { sendMail, request } = arrangeApp(db);
    const sample = await arrangeOwnedSample(db, { published: false });
    // Act
    const res = await request(sample.id);
    // Assert
    expect(res.status).toBe(403);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest("should answer 404 on an unknown sample id", async ({ db }) => {
    // Arrange
    await insertSuperAdmins(db);
    await provisionUser(db, "test-token", { status: "accepted" });
    const { sendMail, request } = arrangeApp(db);
    // Act
    const res = await request(UNKNOWN_ID);
    // Assert
    expect(res.status).toBe(404);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest(
    "should answer 204 and mail no one when the database holds no super admin",
    async ({ db }) => {
      // Arrange
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { sendMail, request } = arrangeApp(db);
      const sample = await arrangeOwnedSample(db);
      // Act
      const res = await request(sample.id);
      // Assert
      expect(res.status).toBe(204);
      await vi.waitFor(() => expect(console.error).toHaveBeenCalled());
      expect(sendMail).not.toHaveBeenCalled();
    },
  );
});
