import { describe, expect, it, vi } from "vitest";

import { createInstitutionalGroupRepository } from "../institutional-group/repository.ts";
import { createManualGroupRepository } from "../manual-group/repository.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { moderateManualGroup } from "../tests/moderate-manual-group.ts";
import { pgTest } from "../tests/pg-test.ts";
import { createUserRepository } from "./repository.ts";
import { sendPendingUsersDigest } from "./send-pending-users-digest.ts";

const repositories = (db: Parameters<typeof createUserRepository>[0]) => ({
  users: createUserRepository(db),
  manualGroups: createManualGroupRepository(db),
  institutionalGroups: createInstitutionalGroupRepository(db),
});

const now = new Date("2026-08-06T12:00:00Z");

const ADMIN_URL = "http://localhost:3001/";

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

      await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["admin@univ-lorraine.fr", "boss@univ-lorraine.fr"],
          subject: "2 users are waiting for activation",
        }),
      );
    },
  );

  pgTest(
    "should send nothing when nothing is pending and no group is orphan",
    async ({ db }) => {
      await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
      await insertUser(db, "researcher@univ-lorraine.fr", {});
      const sendMail = vi.fn().mockResolvedValue(undefined);

      await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);

      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  pgTest(
    "should send nothing when no super admin can be reached",
    async ({ db }) => {
      await insertUser(db, "jean.martin@univ-lorraine.fr", {
        status: "pending",
      });
      const sendMail = vi.fn().mockResolvedValue(undefined);

      await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);

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
        sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now),
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
          users: {
            listPending: () => Promise.reject(new Error("database down")),
            listSuperAdminEmails: () => Promise.resolve([]),
            listSpaceManagers: () => Promise.resolve([]),
          },
          manualGroups: { listWithoutActiveManager: () => Promise.resolve([]) },
          institutionalGroups: {
            listWithoutActiveManager: () => Promise.resolve([]),
          },
        },
        sendMail,
        ADMIN_URL,
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
      await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);
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
    await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);
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
      await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);
      // Assert
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["admin@univ-lorraine.fr"] }),
      );
    },
  );

  pgTest(
    "should mail the super admins the orphan groups when nothing is pending",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
      const groupId = crypto.randomUUID();
      await db
        .insertInto("manual_group")
        .values({ id: groupId, name: "Massif central" })
        .execute();
      await insertUser(db, "member@univ-lorraine.fr", {
        institutionalLaboratory: "UMR7358",
      });
      const sendMail = vi.fn().mockResolvedValue(undefined);
      // Act
      await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);
      // Assert
      expect(sendMail).toHaveBeenCalledTimes(1);
      const mail = sendMail.mock.calls[0]?.[0];
      expect(mail.to).toEqual(["admin@univ-lorraine.fr"]);
      expect(mail.subject).toBe("2 groups have no active manager");
      expect(mail.text).toContain(`/manual-groups/${groupId}`);
      expect(mail.text).toContain("/institutional-groups/laboratories/UMR7358");
    },
  );

  pgTest(
    "should list an institutional group only when a user row records it",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
      await insertUser(db, "member@univ-lorraine.fr", {
        institutionalLaboratory: "UMR7358",
      });
      const sendMail = vi.fn().mockResolvedValue(undefined);
      // Act
      await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);
      // Assert
      const text = sendMail.mock.calls[0]?.[0].text;
      expect(text).toContain("/institutional-groups/laboratories/UMR7358");
      expect(text).not.toContain("/institutional-groups/laboratories/UMR5275");
    },
  );

  pgTest.for([
    {
      kind: "organization" as const,
      code: "04vfs2w97",
      member: { institutionalOrganization: "04vfs2w97" },
      path: "/institutional-groups/organizations/04vfs2w97",
    },
    {
      kind: "osu" as const,
      code: "OTELo",
      member: { institutionalOsu: "OTELo" },
      path: "/institutional-groups/osus/OTELo",
    },
    {
      kind: "laboratory" as const,
      code: "UMR7358",
      member: { institutionalLaboratory: "UMR7358" },
      path: "/institutional-groups/laboratories/UMR7358",
    },
  ])(
    "should recap a $kind whose only manager is not accepted",
    async ({ kind, code, member, path }, { db }) => {
      // Arrange
      await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
      await insertUser(db, "member@univ-lorraine.fr", member);
      const manager = await insertUser(db, "manager@univ-lorraine.fr", {
        status: "rejected",
      });
      await moderateInstitution(db, manager.id, { kind, code });
      const sendMail = vi.fn().mockResolvedValue(undefined);
      // Act
      await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);
      // Assert
      expect(sendMail.mock.calls[0]?.[0].text).toContain(path);
    },
  );

  pgTest(
    "should keep a group with an accepted manager out of the recap",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "admin@univ-lorraine.fr", { superAdmin: true });
      await insertUser(db, "member@univ-lorraine.fr", {
        institutionalLaboratory: "UMR7358",
      });
      const manager = await insertUser(db, "manager@univ-lorraine.fr");
      await moderateInstitution(db, manager.id, {
        kind: "laboratory",
        code: "UMR7358",
      });
      const sendMail = vi.fn().mockResolvedValue(undefined);
      // Act
      await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);
      // Assert
      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  pgTest(
    "should keep the orphan groups out of a space manager's digest",
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
        institutionalLaboratory: "UMR7358",
      });
      const groupId = crypto.randomUUID();
      await db
        .insertInto("manual_group")
        .values({ id: groupId, name: "Massif central" })
        .execute();
      const sendMail = vi.fn().mockResolvedValue(undefined);
      // Act
      await sendPendingUsersDigest(repositories(db), sendMail, ADMIN_URL, now);
      // Assert
      expect(sendMail).toHaveBeenCalledTimes(2);
      expect(sendMail.mock.calls[0]?.[0].text).toContain("Massif central");
      expect(sendMail.mock.calls[1]?.[0].to).toEqual([
        "manager@univ-lorraine.fr",
      ]);
      expect(sendMail.mock.calls[1]?.[0].text).not.toContain("Massif central");
    },
  );
});
