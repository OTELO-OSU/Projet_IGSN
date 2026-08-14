import { describe, expect, it, vi } from "vitest";

import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { createUserRepository } from "./repository.ts";
import { sendPendingUsersDigest } from "./send-pending-users-digest.ts";

const now = new Date("2026-08-06T12:00:00Z");

const USERS_URL = "http://localhost:3001/users";

describe("sendPendingUsersDigest", () => {
  pgTest(
    "should mail the pending accounts digest to every super admin",
    async ({ db }) => {
      await insertUser(db, "admin@univ-lorraine.fr", {
        status: "accepted",
        superAdmin: true,
      });
      await insertUser(db, "boss@univ-lorraine.fr", {
        status: "accepted",
        superAdmin: true,
      });
      await insertUser(db, "marie.dupont@univ-lorraine.fr", {
        name: "Dupont",
        firstname: "Marie",
        createdAt: new Date("2026-08-05T09:00:00Z"),
      });
      await insertUser(db, "jean.martin@univ-lorraine.fr", {
        name: "Martin",
        firstname: "Jean",
        createdAt: new Date("2026-07-07T12:00:00Z"),
      });
      const sendMail = vi.fn().mockResolvedValue(undefined);

      await sendPendingUsersDigest(
        createUserRepository(db),
        sendMail,
        USERS_URL,
        now,
      );

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["admin@univ-lorraine.fr", "boss@univ-lorraine.fr"],
          subject: "2 users are waiting for activation",
        }),
      );
    },
  );

  pgTest("should send nothing when no account is pending", async ({ db }) => {
    await insertUser(db, "admin@univ-lorraine.fr", {
      status: "accepted",
      superAdmin: true,
    });
    await insertUser(db, "researcher@univ-lorraine.fr", { status: "accepted" });
    const sendMail = vi.fn().mockResolvedValue(undefined);

    await sendPendingUsersDigest(
      createUserRepository(db),
      sendMail,
      USERS_URL,
      now,
    );

    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest(
    "should send nothing when no super admin can be reached",
    async ({ db }) => {
      await insertUser(db, "jean.martin@univ-lorraine.fr");
      const sendMail = vi.fn().mockResolvedValue(undefined);

      await sendPendingUsersDigest(
        createUserRepository(db),
        sendMail,
        USERS_URL,
        now,
      );

      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  pgTest(
    "should log a refused send rather than crash the api",
    async ({ db }) => {
      await insertUser(db, "admin@univ-lorraine.fr", {
        status: "accepted",
        superAdmin: true,
      });
      await insertUser(db, "jean.martin@univ-lorraine.fr");
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      const sendMail = vi.fn().mockRejectedValue(new Error("SMTP down"));

      await expect(
        sendPendingUsersDigest(
          createUserRepository(db),
          sendMail,
          USERS_URL,
          now,
        ),
      ).resolves.toBeUndefined();

      expect(logged).toHaveBeenCalled();
      logged.mockRestore();
    },
  );

  it("should log a failed lookup rather than crash the api", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const sendMail = vi.fn().mockResolvedValue(undefined);

    await expect(
      sendPendingUsersDigest(
        {
          listPending: () => Promise.reject(new Error("database down")),
          listSuperAdminEmails: () => Promise.resolve([]),
        },
        sendMail,
        USERS_URL,
        now,
      ),
    ).resolves.toBeUndefined();

    expect(logged).toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    logged.mockRestore();
  });
});
