import type { UpdateUser } from "@projet-igsn/domain/user/user-validator";

import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import {
  adminUserResponseSchema,
  listUsersResponseSchema,
} from "@projet-igsn/domain/user/user-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser, tokenEmail } from "../tests/provision-user.ts";

type Db = Parameters<typeof createApp>[0];

const authHeader = { Authorization: "Bearer moderator" };

const TRIO = {
  institutionalOrganization: "04vfs2w97",
  institutionalOsu: "OTELo",
  institutionalLaboratory: "UMR7358",
};

const update = (over: Partial<UpdateUser> = {}): UpdateUser => ({
  status: "accepted",
  ...TRIO,
  manualGroupIds: [],
  managedGroups: NO_MANAGED_GROUPS,
  ...over,
});

const asSuperAdmin = async (db: Db) => {
  const me = await provisionUser(db, "moderator", {
    status: "accepted",
    superAdmin: true,
  });
  return { me, client: testClient(createApp(db).app) };
};

const readSuperAdmin = async (db: Db, id: string) =>
  (
    await db
      .selectFrom("user")
      .select("super_admin")
      .where("id", "=", id)
      .executeTakeFirstOrThrow()
  ).super_admin;

describe("super admin role", () => {
  pgTest.for([
    ["grant", false, true],
    ["revoke", true, false],
  ] as const)(
    "should let a super admin %s another user's role",
    async ([_action, stored, submitted], { db }) => {
      // Arrange
      const target = await insertUser(db, tokenEmail("target"), {
        ...TRIO,
        superAdmin: stored,
      });
      const { client } = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$put(
        { param: { id: target.id }, json: update({ superAdmin: submitted }) },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        adminUserResponseSchema.parse(await res.json()).data.superAdmin,
      ).toBe(submitted);
      await expect(readSuperAdmin(db, target.id)).resolves.toBe(submitted);
    },
  );

  pgTest(
    "should answer 422 when promoting a user who is not accepted",
    async ({ db }) => {
      // Arrange
      const target = await insertUser(db, tokenEmail("target"), {
        ...TRIO,
        status: "pending",
      });
      const { client } = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: target.id },
          json: update({ status: "pending", superAdmin: true }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(422);
      await expect(readSuperAdmin(db, target.id)).resolves.toBe(false);
    },
  );

  pgTest(
    "should keep a super admin's own role when they submit its removal",
    async ({ db }) => {
      // Arrange
      const { me, client } = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$put(
        { param: { id: me.id }, json: update({ superAdmin: false }) },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      await expect(readSuperAdmin(db, me.id)).resolves.toBe(true);
    },
  );

  pgTest(
    "should keep the stored role when a space manager submits one",
    async ({ db }) => {
      // Arrange
      const target = await insertUser(db, tokenEmail("target"), TRIO);
      const manager = await provisionUser(db, "moderator", {
        status: "accepted",
      });
      await moderateInstitution(db, manager.id, {
        kind: "laboratory",
        code: TRIO.institutionalLaboratory,
      });
      const client = testClient(createApp(db).app);
      // Act
      const res = await client.admin.users[":id"].$put(
        { param: { id: target.id }, json: update({ superAdmin: true }) },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      await expect(readSuperAdmin(db, target.id)).resolves.toBe(false);
    },
  );

  pgTest.for([
    [["super_admin"], ["moderator", "other-admin"]],
    [["space_manager"], ["manager"]],
    [["regular"], ["regular"]],
    [
      ["space_manager", "regular"],
      ["manager", "regular"],
    ],
  ] as const)(
    "should filter the users on the %s role",
    async ([roles, subs], { db }) => {
      // Arrange
      const laboratory = {
        kind: "laboratory",
        code: TRIO.institutionalLaboratory,
      } as const;
      const otherAdmin = await insertUser(db, tokenEmail("other-admin"), {
        superAdmin: true,
      });
      await moderateInstitution(db, otherAdmin.id, laboratory);
      const manager = await insertUser(db, tokenEmail("manager"));
      await moderateInstitution(db, manager.id, laboratory);
      await insertUser(db, tokenEmail("regular"));
      const { client } = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users.$get(
        { query: { page: "1", perPage: "25", roles: [...roles] } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      const body = listUsersResponseSchema.parse(await res.json());
      expect(body.data.map((user) => user.email).sort()).toEqual(
        subs.map(tokenEmail).sort(),
      );
      expect(body.meta.total).toBe(subs.length);
    },
  );
});
