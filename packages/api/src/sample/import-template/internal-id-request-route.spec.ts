import type { Kysely } from "kysely";

import { describe, expect, vi } from "vitest";

import type { DB } from "../../db.ts";
import type { SendMail } from "../../mail/send-mail.ts";

import { createApp } from "../../app.ts";
import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { provisionUser, tokenEmail } from "../../tests/provision-user.ts";

const ADMIN_URL = "http://localhost:3001/admin/";

function arrangeApp(db: Kysely<DB>) {
  const sendMail = vi.fn<SendMail>().mockResolvedValue(undefined);
  const { app } = createApp(db, {
    mail: {
      sendMail,
      adminUrl: ADMIN_URL,
      frontendUrl: "http://localhost:3000",
    },
  });
  const request = (internalIds: string[]) =>
    app.request("/admin/samples/import/internal-id-request", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ internalIds }),
    });
  return { sendMail, request };
}

describe("POST /admin/samples/import/internal-id-request", () => {
  pgTest(
    "should mail every super admin the requester and the internal IDs",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "root-7c1@univ-lorraine.fr", { superAdmin: true });
      const requester = await provisionUser(db, "test-token", {
        status: "accepted",
      });
      const { sendMail, request } = arrangeApp(db);
      // Act
      const res = await request(["sample-12", "sample-13"]);
      // Assert
      expect(res.status).toBe(204);
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
      const sent = sendMail.mock.lastCall![0];
      expect({
        to: sent.to,
        audience: sent.audience,
        replyTo: sent.replyTo,
        text: sent.text,
      }).toEqual({
        to: ["root-7c1@univ-lorraine.fr"],
        audience: "admin",
        replyTo: tokenEmail("test-token"),
        text: expect.stringMatching(
          new RegExp(
            `${tokenEmail("test-token")}[\\s\\S]*sample-12, sample-13[\\s\\S]*${ADMIN_URL}users/${requester.id}`,
          ),
        ),
      });
    },
  );

  pgTest.for<string[]>([[], ["not an id"]])(
    "should answer 400 on %j",
    async (internalIds, { db }) => {
      // Arrange
      await provisionUser(db, "test-token", { status: "accepted" });
      const { sendMail, request } = arrangeApp(db);
      // Act
      const res = await request(internalIds);
      // Assert
      expect(res.status).toBe(400);
      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  pgTest("should answer 401 to an unauthenticated caller", async ({ db }) => {
    // Arrange
    const { app } = createApp(db);
    // Act
    const res = await app.request("/admin/samples/import/internal-id-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ internalIds: ["sample-12"] }),
    });
    // Assert
    expect(res.status).toBe(401);
  });
});
