import type { InstitutionalGroupRef } from "@projet-igsn/domain/institutional-group/model";
import type { Kysely } from "kysely";

import {
  groupManagersResponseSchema,
  institutionalGroupCountsResponseSchema,
} from "@projet-igsn/domain/user/user-validator";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";

const LABORATORY = { kind: "laboratory", code: "UMR7358" } as const;
const UNKNOWN_USER = "01890a5d-ac96-774b-bcce-b302099a9099";

const authHeader = { Authorization: "Bearer moderator" };

type Db = Kysely<DB>;

const asSuperAdmin = async (db: Db) => {
  await provisionUser(db, "moderator", {
    status: "accepted",
    superAdmin: true,
  });
  return testClient(createApp(db).app);
};

type Client = Awaited<ReturnType<typeof asSuperAdmin>>;

const listManagers = (client: Client, param: InstitutionalGroupRef) =>
  client.admin["institutional-groups"][":kind"][":code"].managers.$get(
    { param },
    { headers: authHeader },
  );

const addManager = (
  client: Client,
  param: InstitutionalGroupRef,
  userId: string,
) =>
  client.admin["institutional-groups"][":kind"][":code"].managers.$post(
    { param, json: { userId } },
    { headers: authHeader },
  );

const removeManager = (
  client: Client,
  param: InstitutionalGroupRef,
  userId: string,
) =>
  client.admin["institutional-groups"][":kind"][":code"].managers[
    ":userId"
  ].$delete({ param: { ...param, userId } }, { headers: authHeader });

const managedCodes = async (db: Db, userId: string) => {
  const rows = await db
    .selectFrom("user_managed_institutional_group")
    .select(["kind", "code"])
    .where("user_id", "=", userId)
    .execute();
  return rows;
};

describe("admin institutional group routes", () => {
  pgTest(
    "should list a laboratory's managers with their status",
    async ({ db }) => {
      // Arrange
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const dupont = await insertUser(db, "pierre.dupont@univ-lorraine.fr", {
        status: "rejected",
      });
      const outside = await insertUser(db, "outside@univ-lorraine.fr");
      await moderateInstitution(db, curie.id, LABORATORY);
      await moderateInstitution(db, dupont.id, LABORATORY);
      await moderateInstitution(db, outside.id, {
        kind: "laboratory",
        code: "UMR5275",
      });
      const client = await asSuperAdmin(db);
      // Act
      const res = await listManagers(client, LABORATORY);
      // Assert
      expect(res.status).toBe(200);
      expect(
        groupManagersResponseSchema
          .parse(await res.json())
          .data.map(({ email, status }) => ({ email, status })),
      ).toEqual([
        { email: "marie.curie@univ-lorraine.fr", status: "accepted" },
        { email: "pierre.dupont@univ-lorraine.fr", status: "rejected" },
      ]);
    },
  );

  pgTest("should add a manager", async ({ db }) => {
    // Arrange
    const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
    const client = await asSuperAdmin(db);
    // Act
    const res = await addManager(client, LABORATORY, curie.id);
    // Assert
    expect(res.status).toBe(204);
    expect(await managedCodes(db, curie.id)).toEqual([
      { kind: "laboratory", code: "UMR7358" },
    ]);
  });

  pgTest("should accept adding a manager twice", async ({ db }) => {
    // Arrange
    const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
    await moderateInstitution(db, curie.id, LABORATORY);
    const client = await asSuperAdmin(db);
    // Act
    const res = await addManager(client, LABORATORY, curie.id);
    // Assert
    expect(res.status).toBe(204);
    expect(await managedCodes(db, curie.id)).toHaveLength(1);
  });

  pgTest(
    "should answer 422 adding a manager who is not accepted",
    async ({ db }) => {
      // Arrange
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr", {
        status: "pending",
      });
      const client = await asSuperAdmin(db);
      // Act
      const res = await addManager(client, LABORATORY, curie.id);
      // Assert
      expect(res.status).toBe(422);
      expect(await managedCodes(db, curie.id)).toEqual([]);
    },
  );

  pgTest("should answer 404 adding an unknown user", async ({ db }) => {
    // Arrange
    const client = await asSuperAdmin(db);
    // Act
    const res = await addManager(client, LABORATORY, UNKNOWN_USER);
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should remove a manager", async ({ db }) => {
    // Arrange
    const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
    await moderateInstitution(db, curie.id, LABORATORY);
    const client = await asSuperAdmin(db);
    // Act
    const res = await removeManager(client, LABORATORY, curie.id);
    // Assert
    expect(res.status).toBe(204);
    expect(await managedCodes(db, curie.id)).toEqual([]);
  });

  pgTest(
    "should answer 404 removing a user who does not manage the group",
    async ({ db }) => {
      // Arrange
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const client = await asSuperAdmin(db);
      // Act
      const res = await removeManager(client, LABORATORY, curie.id);
      // Assert
      expect(res.status).toBe(404);
    },
  );

  pgTest("should count the accepted managers of each kind", async ({ db }) => {
    // Arrange
    const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
    const dupont = await insertUser(db, "pierre.dupont@univ-lorraine.fr", {
      status: "rejected",
    });
    await moderateInstitution(
      db,
      curie.id,
      LABORATORY,
      { kind: "organization", code: "04vfs2w97" },
      { kind: "osu", code: "OTELo" },
    );
    await moderateInstitution(db, dupont.id, LABORATORY);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin["institutional-groups"][
      "manager-counts"
    ].$get(undefined, { headers: authHeader });
    // Assert
    expect(res.status).toBe(200);
    expect(
      institutionalGroupCountsResponseSchema.parse(await res.json()),
    ).toEqual({
      data: {
        organizations: { "04vfs2w97": 1 },
        osus: { OTELo: 1 },
        laboratories: { UMR7358: 1 },
      },
    });
  });

  pgTest.for([
    { case: "an unknown kind", path: "team/UMR7358" },
    { case: "an unknown code", path: "laboratory/NOPE" },
  ])("should answer 400 on $case", async ({ path }, { db }) => {
    // Arrange
    await asSuperAdmin(db);
    // Act
    const res = await createApp(db).app.request(
      `/admin/institutional-groups/${path}/managers`,
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(400);
  });

  pgTest(
    "should answer 403 to a user who is not super admin",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "moderator", { status: "accepted" });
      const client = testClient(createApp(db).app);
      // Act
      const res = await listManagers(client, LABORATORY);
      // Assert
      expect(res.status).toBe(403);
    },
  );

  pgTest("should answer 401 to an unauthenticated caller", async ({ db }) => {
    // Act
    const res = await createApp(db).app.request(
      "/admin/institutional-groups/laboratory/UMR7358/managers",
    );
    // Assert
    expect(res.status).toBe(401);
  });

  pgTest.for(["post", "delete"] as const)(
    "should answer 401 to a %s on a revoked session",
    async (method, { db }) => {
      // Arrange
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const client = await asSuperAdmin(db);
      vi.mocked(requireActiveSession).mockImplementationOnce(async (c) =>
        c.json({ error: "Unauthorized" }, 401),
      );
      // Act
      const res =
        method === "post"
          ? await addManager(client, LABORATORY, curie.id)
          : await removeManager(client, LABORATORY, curie.id);
      // Assert
      expect(res.status).toBe(401);
    },
  );
});
