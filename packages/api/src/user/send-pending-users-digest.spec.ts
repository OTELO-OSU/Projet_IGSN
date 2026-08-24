import { describe, expect, it, vi } from "vitest";

import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { moderateManualGroup } from "../tests/moderate-manual-group.ts";
import { pgTest } from "../tests/pg-test.ts";
import { createUserRepository } from "./repository.ts";
import { sendPendingUsersDigest } from "./send-pending-users-digest.ts";

const now = new Date("2026-08-06T12:00:00Z");

const USERS_URL = "http://localhost:3001/users";

describe("sendPendingUsersDigest", () => {
  pgTest(
    "should mail the pending accounts digest to every super admin",
    async ({ db }) => {
      await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
      await insertUser(db, "boss@univ-lorraine.fr", { superAdmin: true });
      await insertUser(db, "marie.dupont@univ-lorraine.fr", {
        name: "Dupont",
        firstname: "Marie",
        status: "pending",
        createdAt: new Date("2026-08-05T09:00:00Z"),
      });
      await insertUser(db, "jean.martin@univ-lorraine.fr", {
        name: "Martin",
        firstname: "Jean",
        status: "pending",
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
    await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
    await insertUser(db, "researcher@univ-lorraine.fr", {});
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
      await insertUser(db, "jean.martin@univ-lorraine.fr", {
        status: "pending",
      });
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
      await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
      await insertUser(db, "jean.martin@univ-lorraine.fr", {
        status: "pending",
      });
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
          listSpaceManagers: () => Promise.resolve([]),
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

  pgTest(
    "should mail an institution manager only the pending users of its laboratories",
    async ({ db }) => {
      // Arrange
      const admin = await insertUser(db, "admin@univ-lorraine.fr", {
        superAdmin: true,
      });
      await moderateInstitution(db, admin.id, {
        kind: "laboratory",
        code: "UMR7358",
      });
      const manager = await insertUser(db, "manager@univ-lorraine.fr");
      await moderateInstitution(db, manager.id, {
        kind: "laboratory",
        code: "UMR7358",
      });
      await insertUser(db, "inside@univ-lorraine.fr", {
        name: "Inside",
        firstname: "Ines",
        status: "pending",
        institutionalLaboratory: "UMR7358",
      });
      await insertUser(db, "outside@univ-lorraine.fr", {
        name: "Outside",
        firstname: "Oscar",
        status: "pending",
        institutionalLaboratory: "UMR5275",
      });
      const sendMail = vi.fn().mockResolvedValue(undefined);
      // Act
      await sendPendingUsersDigest(
        createUserRepository(db),
        sendMail,
        USERS_URL,
        now,
      );
      // Assert
      expect(sendMail).toHaveBeenCalledTimes(2);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["admin@univ-lorraine.fr"],
          subject: "2 users are waiting for activation",
        }),
      );
      expect(sendMail).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          to: ["manager@univ-lorraine.fr"],
          subject: "1 user is waiting for activation",
        }),
      );
      const scoped = sendMail.mock.calls[1]?.[0].text;
      expect(scoped).toContain("inside@univ-lorraine.fr");
      expect(scoped).not.toContain("outside@univ-lorraine.fr");
    },
  );

  pgTest("should mail no manual group manager", async ({ db }) => {
    // Arrange
    await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
    const groupId = crypto.randomUUID();
    await db
      .insertInto("manual_group")
      .values({ id: groupId, name: "Massif central" })
      .execute();
    const manager = await insertUser(db, "manager@univ-lorraine.fr");
    await moderateManualGroup(db, manager.id, [groupId]);
    const member = await insertUser(db, "member@univ-lorraine.fr", {
      status: "pending",
    });
    await db
      .insertInto("manual_group_member")
      .values({ group_id: groupId, user_id: member.id })
      .execute();
    const sendMail = vi.fn().mockResolvedValue(undefined);
    // Act
    await sendPendingUsersDigest(
      createUserRepository(db),
      sendMail,
      USERS_URL,
      now,
    );
    // Assert
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["admin@univ-lorraine.fr"] }),
    );
  });

  pgTest(
    "should mail no manager when no pending user sits in its laboratories",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
      const manager = await insertUser(db, "manager@univ-lorraine.fr");
      await moderateInstitution(db, manager.id, {
        kind: "laboratory",
        code: "UMR7358",
      });
      await insertUser(db, "waiting@univ-lorraine.fr", {
        status: "pending",
        institutionalLaboratory: "UMR5275",
      });
      const sendMail = vi.fn().mockResolvedValue(undefined);
      // Act
      await sendPendingUsersDigest(
        createUserRepository(db),
        sendMail,
        USERS_URL,
        now,
      );
      // Assert
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["admin@univ-lorraine.fr"] }),
      );
    },
  );
});
