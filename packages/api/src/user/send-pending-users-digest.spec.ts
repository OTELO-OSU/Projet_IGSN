import { describe, expect, vi } from "vitest";

import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { createUserRepository } from "./repository.ts";
import { sendPendingUsersDigest } from "./send-pending-users-digest.ts";

const now = new Date("2026-08-06T12:00:00Z");

describe("sendPendingUsersDigest", () => {
  pgTest(
    "should mail every super admin the accounts waiting, longest first",
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

      await sendPendingUsersDigest(createUserRepository(db), sendMail, now);

      expect(sendMail).toHaveBeenCalledWith({
        to: ["admin@univ-lorraine.fr", "boss@univ-lorraine.fr"],
        subject: "2 users are waiting for validation",
        text: `2 users are waiting for validation:

- Jean Martin (jean.martin@univ-lorraine.fr), waiting for 30 days
- Marie Dupont (marie.dupont@univ-lorraine.fr), waiting for 1 day
`,
      });
    },
  );

  pgTest("should send nothing when no account is pending", async ({ db }) => {
    await insertUser(db, "admin@univ-lorraine.fr", {
      status: "accepted",
      superAdmin: true,
    });
    await insertUser(db, "researcher@univ-lorraine.fr", { status: "accepted" });
    const sendMail = vi.fn().mockResolvedValue(undefined);

    await sendPendingUsersDigest(createUserRepository(db), sendMail, now);

    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest(
    "should send nothing when no super admin can be reached",
    async ({ db }) => {
      await insertUser(db, "jean.martin@univ-lorraine.fr");
      const sendMail = vi.fn().mockResolvedValue(undefined);

      await sendPendingUsersDigest(createUserRepository(db), sendMail, now);

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
        sendPendingUsersDigest(createUserRepository(db), sendMail, now),
      ).resolves.toBeUndefined();

      expect(logged).toHaveBeenCalled();
      logged.mockRestore();
    },
  );
});
