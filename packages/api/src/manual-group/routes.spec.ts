import type { Kysely } from "kysely";

import {
  listManualGroupsResponseSchema,
  manualGroupMembersResponseSchema,
  manualGroupResponseSchema,
  myManualGroupsResponseSchema,
} from "@projet-igsn/domain/manual-group/manual-group-validator";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateManualGroup } from "../tests/moderate-manual-group.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";

const ADMIN_URL = "http://localhost:3001/";

const MASSIF = "01890a5d-ac96-774b-bcce-b302099a9001";
const ALPES = "01890a5d-ac96-774b-bcce-b302099a9002";
const UNKNOWN = "01890a5d-ac96-774b-bcce-b302099a9099";

const authHeader = { Authorization: "Bearer moderator" };
const managerHeader = { Authorization: "Bearer manager" };
const researcherHeader = { Authorization: "Bearer researcher" };

type Db = Kysely<DB>;

const insertGroup = (db: Db, id: string, name: string) =>
  db.insertInto("manual_group").values({ id, name }).execute();

const insertMember = (db: Db, groupId: string, userId: string) =>
  db
    .insertInto("manual_group_member")
    .values({ group_id: groupId, user_id: userId })
    .execute();

const provisionSuperAdmin = (db: Db) =>
  provisionUser(db, "moderator", { status: "accepted", superAdmin: true });

const asSuperAdmin = async (db: Db) => {
  await provisionSuperAdmin(db);
  return testClient(createApp(db).app);
};

const asSuperAdminWithMail = async (db: Db) => {
  await provisionSuperAdmin(db);
  const sendMail = vi.fn().mockResolvedValue(undefined);
  const client = testClient(
    createApp(db, { mail: { sendMail, adminUrl: ADMIN_URL } }).app,
  );
  return { client, sendMail };
};

const asGroupManager = async (db: Db, groupIds: string[]) => {
  const manager = await provisionUser(db, "manager", { status: "accepted" });
  await moderateManualGroup(db, manager.id, groupIds);
  return testClient(createApp(db).app);
};

type Client = Awaited<ReturnType<typeof asSuperAdmin>>;

const addMember = (client: Client, groupId: string, userId: string) =>
  client.admin["manual-groups"][":id"].members.$post(
    { param: { id: groupId }, json: { userId } },
    { headers: authHeader },
  );

const countMembers = async (db: Db, groupId: string) => {
  const rows = await db
    .selectFrom("manual_group_member")
    .select("user_id")
    .where("group_id", "=", groupId)
    .execute();
  return rows.length;
};

const insertSampleInGroup = async (
  db: Db,
  userId: string,
  groupId?: string,
  role: "owner" | "contributor" = "owner",
) => {
  const sample = await insertSample(db, {
    name: "Basalte du Massif Central",
    nature: "thin_section",
    type: null,
    collectionMethod: null,
  });
  await db
    .insertInto("user_sample")
    .values({ sample_id: sample.id, user_id: userId, role })
    .execute();
  if (groupId) {
    await db
      .insertInto("sample_manual_group")
      .values({ sample_id: sample.id, group_id: groupId })
      .execute();
  }
  return sample.id;
};

const attachedGroupIds = async (db: Db, sampleId: string) => {
  const rows = await db
    .selectFrom("sample_manual_group")
    .select("group_id")
    .where("sample_id", "=", sampleId)
    .execute();
  return rows.map((row) => row.group_id);
};

const groupName = (db: Db, id: string) =>
  db
    .selectFrom("manual_group")
    .select("name")
    .where("id", "=", id)
    .executeTakeFirstOrThrow();

describe("admin manual group routes", () => {
  pgTest(
    "should page and search the groups in SQL, member count and total included",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertGroup(db, ALPES, "Alpes 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const dupont = await insertUser(db, "pierre.dupont@univ-lorraine.fr");
      await insertMember(db, MASSIF, curie.id);
      await insertMember(db, MASSIF, dupont.id);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"].$get(
        { query: { page: "1", perPage: "25", search: "massif" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(listManualGroupsResponseSchema.parse(await res.json())).toEqual({
        data: [{ id: MASSIF, name: "Massif Central 2026", memberCount: 2 }],
        meta: { total: 1 },
      });
    },
  );

  pgTest("should create a group", async ({ db }) => {
    // Arrange
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin["manual-groups"].$post(
      { json: { name: "Massif Central 2026", managerIds: [] } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(201);
    const { data } = manualGroupResponseSchema.parse(await res.json());
    expect(data.name).toBe("Massif Central 2026");
    await expect(groupName(db, data.id)).resolves.toEqual({
      name: "Massif Central 2026",
    });
  });

  pgTest(
    "should answer 409 when the name is taken, differing case included",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"].$post(
        { json: { name: "massif central 2026", managerIds: [] } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(409);
      expect(
        await db.selectFrom("manual_group").select("id").execute(),
      ).toHaveLength(1);
    },
  );

  pgTest(
    "should let the picked managers moderate the group it creates",
    async ({ db }) => {
      // Arrange
      const curie = await provisionUser(db, "manager", { status: "accepted" });
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"].$post(
        { json: { name: "Massif Central 2026", managerIds: [curie.id] } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(201);
      const { data } = manualGroupResponseSchema.parse(await res.json());
      const theirs = await client.admin["manual-groups"].$get(
        { query: { page: "1", perPage: "25" } },
        { headers: managerHeader },
      );
      expect(listManualGroupsResponseSchema.parse(await theirs.json())).toEqual(
        {
          data: [{ id: data.id, name: "Massif Central 2026", memberCount: 0 }],
          meta: { total: 1 },
        },
      );
    },
  );

  pgTest.for([
    ["an unknown user id", null, 404],
    ["a user who is not accepted", "pending", 422],
  ] as const)(
    "should refuse the creation when a picked manager is %s",
    async ([, status, expected], { db }) => {
      // Arrange
      const managerId = status
        ? (await insertUser(db, "marie.curie@univ-lorraine.fr", { status })).id
        : UNKNOWN;
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"].$post(
        { json: { name: "Massif Central 2026", managerIds: [managerId] } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(expected);
    },
  );

  pgTest("should refuse a creation on a revoked session", async ({ db }) => {
    // Arrange
    const client = await asSuperAdmin(db);
    vi.mocked(requireActiveSession).mockImplementationOnce(async (c) =>
      c.json({ error: "Unauthorized" }, 401),
    );
    // Act
    const res = await client.admin["manual-groups"].$post(
      { json: { name: "Massif Central 2026", managerIds: [] } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(401);
    expect(await db.selectFrom("manual_group").select("id").execute()).toEqual(
      [],
    );
  });

  pgTest("should read one group", async ({ db }) => {
    // Arrange
    await insertGroup(db, MASSIF, "Massif Central 2026");
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin["manual-groups"][":id"].$get(
      { param: { id: MASSIF } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(manualGroupResponseSchema.parse(await res.json())).toEqual({
      data: { id: MASSIF, name: "Massif Central 2026" },
    });
  });

  pgTest("should rename a group", async ({ db }) => {
    // Arrange
    await insertGroup(db, MASSIF, "Massif Central 2026");
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin["manual-groups"][":id"].$put(
      { param: { id: MASSIF }, json: { name: "Massif Central 2027" } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(manualGroupResponseSchema.parse(await res.json())).toEqual({
      data: { id: MASSIF, name: "Massif Central 2027" },
    });
  });

  pgTest(
    "should answer 409 when a rename takes another name, differing case included",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertGroup(db, ALPES, "Alpes 2026");
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"][":id"].$put(
        { param: { id: ALPES }, json: { name: "MASSIF CENTRAL 2026" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(409);
      await expect(groupName(db, ALPES)).resolves.toEqual({
        name: "Alpes 2026",
      });
    },
  );

  pgTest(
    "should delete a group, dropping its memberships and keeping the users",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      await insertMember(db, MASSIF, curie.id);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"][":id"].$delete(
        { param: { id: MASSIF } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(204);
      expect(await countMembers(db, MASSIF)).toBe(0);
      await expect(
        db
          .selectFrom("user")
          .select("email")
          .where("id", "=", curie.id)
          .executeTakeFirstOrThrow(),
      ).resolves.toEqual({ email: "marie.curie@univ-lorraine.fr" });
    },
  );

  pgTest(
    "should delete a group attached to a draft sample, detaching it and keeping the sample",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const sample = await insertSampleInGroup(db, curie.id, MASSIF);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"][":id"].$delete(
        { param: { id: MASSIF } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(204);
      expect(await attachedGroupIds(db, sample)).toEqual([]);
      await expect(
        db
          .selectFrom("sample")
          .select("id")
          .where("id", "=", sample)
          .executeTakeFirstOrThrow(),
      ).resolves.toEqual({ id: sample });
    },
  );

  pgTest(
    "should answer 409 when deleting a group a published sample is attached to",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const sample = await insertSampleInGroup(db, curie.id, MASSIF);
      await publishSample(db, sample);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"][":id"].$delete(
        { param: { id: MASSIF } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(409);
      await expect(groupName(db, MASSIF)).resolves.toEqual({
        name: "Massif Central 2026",
      });
    },
  );

  pgTest(
    "should list the members with their account status",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr", {
        name: "Curie",
        firstname: "Marie",
        status: "pending",
      });
      await insertMember(db, MASSIF, curie.id);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"][":id"].members.$get(
        { param: { id: MASSIF } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(manualGroupMembersResponseSchema.parse(await res.json())).toEqual({
        data: [
          {
            id: curie.id,
            email: "marie.curie@univ-lorraine.fr",
            name: "Curie",
            firstname: "Marie",
            orcid: null,
            status: "pending",
            canDetach: true,
          },
        ],
      });
    },
  );

  pgTest(
    "should mark a member owning a published sample of the group undetachable",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const dupont = await insertUser(db, "pierre.dupont@univ-lorraine.fr");
      await insertMember(db, MASSIF, curie.id);
      await insertMember(db, MASSIF, dupont.id);
      await publishSample(db, await insertSampleInGroup(db, curie.id, MASSIF));
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"][":id"].members.$get(
        { param: { id: MASSIF } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        manualGroupMembersResponseSchema
          .parse(await res.json())
          .data.map(({ email, canDetach }) => [email, canDetach]),
      ).toEqual([
        ["marie.curie@univ-lorraine.fr", false],
        ["pierre.dupont@univ-lorraine.fr", true],
      ]);
    },
  );

  pgTest("should associate an accepted user and mail them", async ({ db }) => {
    // Arrange
    await insertGroup(db, MASSIF, "Massif Central 2026");
    const curie = await insertUser(db, "marie.curie@univ-lorraine.fr", {
      name: "Curie",
      firstname: "Marie",
    });
    const { client, sendMail } = await asSuperAdminWithMail(db);
    // Act
    const res = await addMember(client, MASSIF, curie.id);
    // Assert
    expect(res.status).toBe(204);
    expect(await countMembers(db, MASSIF)).toBe(1);
    await vi.waitFor(() =>
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["marie.curie@univ-lorraine.fr"],
          subject: expect.stringContaining("Massif Central 2026"),
        }),
      ),
    );
  });

  pgTest(
    "should keep one membership and mail once when the same user is added twice",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const { client, sendMail } = await asSuperAdminWithMail(db);
      await addMember(client, MASSIF, curie.id);
      // Act
      const res = await addMember(client, MASSIF, curie.id);
      // Assert
      expect(res.status).toBe(204);
      expect(await countMembers(db, MASSIF)).toBe(1);
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    },
  );

  pgTest(
    "should keep the membership when the notification mail fails",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      const { client, sendMail } = await asSuperAdminWithMail(db);
      sendMail.mockRejectedValue(new Error("SMTP down"));
      // Act
      const res = await addMember(client, MASSIF, curie.id);
      // Assert
      expect(res.status).toBe(204);
      expect(await countMembers(db, MASSIF)).toBe(1);
      await vi.waitFor(() => expect(logged).toHaveBeenCalled());
      logged.mockRestore();
    },
  );

  pgTest.for(["pending", "rejected"] as const)(
    "should answer 422 when associating a %s account",
    async (status, { db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr", {
        status,
      });
      const client = await asSuperAdmin(db);
      // Act
      const res = await addMember(client, MASSIF, curie.id);
      // Assert
      expect(res.status).toBe(422);
      expect(await countMembers(db, MASSIF)).toBe(0);
    },
  );

  pgTest(
    "should keep the membership of a member rejected after joining",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr", {
        status: "rejected",
      });
      await insertMember(db, MASSIF, curie.id);
      const client = await asSuperAdmin(db);
      // Act
      const res = await addMember(client, MASSIF, curie.id);
      // Assert
      expect(res.status).toBe(204);
      expect(await countMembers(db, MASSIF)).toBe(1);
    },
  );

  pgTest(
    "should answer 404 when associating an unknown user",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const client = await asSuperAdmin(db);
      // Act
      const res = await addMember(client, MASSIF, UNKNOWN);
      // Assert
      expect(res.status).toBe(404);
    },
  );

  pgTest("should remove a member", async ({ db }) => {
    // Arrange
    await insertGroup(db, MASSIF, "Massif Central 2026");
    const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
    await insertMember(db, MASSIF, curie.id);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin["manual-groups"][":id"].members[
      ":userId"
    ].$delete(
      { param: { id: MASSIF, userId: curie.id } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(204);
    expect(await countMembers(db, MASSIF)).toBe(0);
  });

  pgTest(
    "should trace a membership change with ids only, no email",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const moderator = await provisionSuperAdmin(db);
      const info = vi.spyOn(console, "info").mockImplementation(() => {});
      // Act
      await addMember(testClient(createApp(db).app), MASSIF, curie.id);
      // Assert
      expect(info).toHaveBeenCalledWith("manual group membership changed", {
        actor: moderator.id,
        group: MASSIF,
        target: curie.id,
      });
      info.mockRestore();
    },
  );

  describe("unknown group", () => {
    pgTest("should answer 404 on every group route", async ({ db }) => {
      // Arrange
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      const client = await asSuperAdmin(db);
      const param = { id: UNKNOWN };
      // Act
      const responses = await Promise.all([
        client.admin["manual-groups"][":id"].$get(
          { param },
          { headers: authHeader },
        ),
        client.admin["manual-groups"][":id"].$put(
          { param, json: { name: "Alpes 2026" } },
          { headers: authHeader },
        ),
        client.admin["manual-groups"][":id"].$delete(
          { param },
          { headers: authHeader },
        ),
        client.admin["manual-groups"][":id"].members.$get(
          { param },
          { headers: authHeader },
        ),
        addMember(client, UNKNOWN, curie.id),
        client.admin["manual-groups"][":id"].members[":userId"].$delete(
          { param: { id: UNKNOWN, userId: curie.id } },
          { headers: authHeader },
        ),
      ]);
      // Assert
      expect(responses.map(({ status }) => status)).toEqual([
        404, 404, 404, 404, 404, 404,
      ]);
    });
  });

  pgTest.for([
    { case: "an empty name", path: "", body: { name: " " } },
    { case: "an unknown extra field", path: "", body: { name: "A", id: "x" } },
    {
      case: "a member id that is not a uuid",
      path: `/${MASSIF}/members`,
      body: { userId: "not-a-uuid" },
    },
  ])("should answer 400 on $case", async ({ path, body }, { db }) => {
    // Arrange
    await insertGroup(db, MASSIF, "Massif Central 2026");
    await asSuperAdmin(db);
    // Act
    const res = await createApp(db).app.request(`/admin/manual-groups${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeader },
      body: JSON.stringify(body),
    });
    // Assert
    expect(res.status).toBe(400);
  });

  pgTest("should reject a malformed group id with 400", async ({ db }) => {
    // Arrange
    await asSuperAdmin(db);
    // Act
    const res = await createApp(db).app.request(
      "/admin/manual-groups/not-a-uuid",
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(400);
  });

  pgTest(
    "should answer 409 detaching a member owning a published sample of the group",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      await insertMember(db, MASSIF, curie.id);
      await publishSample(db, await insertSampleInGroup(db, curie.id, MASSIF));
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin["manual-groups"][":id"].members[
        ":userId"
      ].$delete(
        { param: { id: MASSIF, userId: curie.id } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ reason: "has_published_sample" });
      expect(await countMembers(db, MASSIF)).toBe(1);
    },
  );

  describe("a manual group manager", () => {
    pgTest("should list only the groups it manages", async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertGroup(db, ALPES, "Alpes 2026");
      const client = await asGroupManager(db, [MASSIF]);
      // Act
      const res = await client.admin["manual-groups"].$get(
        { query: { page: "1", perPage: "25" } },
        { headers: managerHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(listManualGroupsResponseSchema.parse(await res.json())).toEqual({
        data: [{ id: MASSIF, name: "Massif Central 2026", memberCount: 0 }],
        meta: { total: 1 },
      });
    });

    pgTest(
      "should lose the role when the only managed group is deleted",
      async ({ db }) => {
        // Arrange
        await insertGroup(db, MASSIF, "Massif Central 2026");
        const client = await asGroupManager(db, [MASSIF]);
        // Act
        await db.deleteFrom("manual_group").where("id", "=", MASSIF).execute();
        const res = await client.admin["manual-groups"].$get(
          { query: { page: "1", perPage: "25" } },
          { headers: managerHeader },
        );
        // Assert
        expect(res.status).toBe(403);
      },
    );

    pgTest(
      "should read, associate and detach the members of a group it manages",
      async ({ db }) => {
        // Arrange
        await insertGroup(db, MASSIF, "Massif Central 2026");
        const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
        const client = await asGroupManager(db, [MASSIF]);
        // Act
        const added = await client.admin["manual-groups"][":id"].members.$post(
          { param: { id: MASSIF }, json: { userId: curie.id } },
          { headers: managerHeader },
        );
        const members = await client.admin["manual-groups"][":id"].members.$get(
          { param: { id: MASSIF } },
          { headers: managerHeader },
        );
        const detached = await client.admin["manual-groups"][":id"].members[
          ":userId"
        ].$delete(
          { param: { id: MASSIF, userId: curie.id } },
          { headers: managerHeader },
        );
        // Assert
        expect([added.status, members.status, detached.status]).toEqual([
          204, 200, 204,
        ]);
        expect(
          manualGroupMembersResponseSchema
            .parse(await members.json())
            .data.map(({ email }) => email),
        ).toEqual(["marie.curie@univ-lorraine.fr"]);
        expect(await countMembers(db, MASSIF)).toBe(0);
      },
    );

    pgTest(
      "should answer 403 on a group it does not manage",
      async ({ db }) => {
        // Arrange
        await insertGroup(db, MASSIF, "Massif Central 2026");
        await insertGroup(db, ALPES, "Alpes 2026");
        const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
        await insertMember(db, ALPES, curie.id);
        const client = await asGroupManager(db, [MASSIF]);
        const param = { id: ALPES };
        // Act
        const responses = await Promise.all([
          client.admin["manual-groups"][":id"].$get(
            { param },
            { headers: managerHeader },
          ),
          client.admin["manual-groups"][":id"].members.$get(
            { param },
            { headers: managerHeader },
          ),
          client.admin["manual-groups"][":id"].members.$post(
            { param, json: { userId: curie.id } },
            { headers: managerHeader },
          ),
          client.admin["manual-groups"][":id"].members[":userId"].$delete(
            { param: { id: ALPES, userId: curie.id } },
            { headers: managerHeader },
          ),
        ]);
        // Assert
        expect(responses.map(({ status }) => status)).toEqual([
          403, 403, 403, 403,
        ]);
        expect(await countMembers(db, ALPES)).toBe(1);
      },
    );

    pgTest(
      "should answer 403 creating, renaming or deleting a group",
      async ({ db }) => {
        // Arrange
        await insertGroup(db, MASSIF, "Massif Central 2026");
        const client = await asGroupManager(db, [MASSIF]);
        // Act
        const responses = await Promise.all([
          client.admin["manual-groups"].$post(
            { json: { name: "Alpes 2026", managerIds: [] } },
            { headers: managerHeader },
          ),
          client.admin["manual-groups"][":id"].$put(
            { param: { id: MASSIF }, json: { name: "Alpes 2026" } },
            { headers: managerHeader },
          ),
          client.admin["manual-groups"][":id"].$delete(
            { param: { id: MASSIF } },
            { headers: managerHeader },
          ),
        ]);
        // Assert
        expect(responses.map(({ status }) => status)).toEqual([403, 403, 403]);
        await expect(groupName(db, MASSIF)).resolves.toEqual({
          name: "Massif Central 2026",
        });
      },
    );
  });

  describe("authorization", () => {
    pgTest.for(["accepted", "pending"] as const)(
      "should answer 403 to a %s user who is not super admin",
      async (status, { db }) => {
        // Arrange
        await insertGroup(db, MASSIF, "Massif Central 2026");
        await provisionUser(db, "moderator", { status });
        const client = testClient(createApp(db).app);
        // Act
        const list = await client.admin["manual-groups"].$get(
          { query: { page: "1", perPage: "25" } },
          { headers: authHeader },
        );
        const create = await client.admin["manual-groups"].$post(
          { json: { name: "Alpes 2026", managerIds: [] } },
          { headers: authHeader },
        );
        // Assert
        expect([list.status, create.status]).toEqual([403, 403]);
      },
    );

    pgTest("should answer 401 to an unauthenticated caller", async ({ db }) => {
      // Act
      const res = await createApp(db).app.request("/admin/manual-groups");
      // Assert
      expect(res.status).toBe(401);
    });
  });
});

describe("the caller's own manual groups", () => {
  pgTest("should list the caller's groups, leaving allowed", async ({ db }) => {
    // Arrange
    await insertGroup(db, MASSIF, "Massif Central 2026");
    await insertGroup(db, ALPES, "Alpes 2026");
    const researcher = await provisionUser(db, "researcher");
    await insertMember(db, MASSIF, researcher.id);
    // Act
    const res = await testClient(createApp(db).app).admin.currentUser[
      "manual-groups"
    ].$get(undefined, { headers: researcherHeader });
    // Assert
    expect(res.status).toBe(200);
    expect(myManualGroupsResponseSchema.parse(await res.json())).toEqual({
      data: [{ id: MASSIF, name: "Massif Central 2026", canLeave: true }],
    });
  });

  pgTest(
    "should refuse leaving only the group holding the caller's published sample",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertGroup(db, ALPES, "Alpes 2026");
      const researcher = await provisionUser(db, "researcher");
      await insertMember(db, MASSIF, researcher.id);
      await insertMember(db, ALPES, researcher.id);
      await publishSample(
        db,
        await insertSampleInGroup(db, researcher.id, MASSIF),
      );
      const client = testClient(createApp(db).app);
      // Act
      const res = await client.admin.currentUser["manual-groups"][
        ":id"
      ].$delete({ param: { id: MASSIF } }, { headers: researcherHeader });
      // Assert
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ reason: "has_published_sample" });
      expect(await countMembers(db, MASSIF)).toBe(1);
      const mine = await client.admin.currentUser["manual-groups"].$get(
        undefined,
        { headers: researcherHeader },
      );
      expect(myManualGroupsResponseSchema.parse(await mine.json())).toEqual({
        data: [
          { id: ALPES, name: "Alpes 2026", canLeave: true },
          { id: MASSIF, name: "Massif Central 2026", canLeave: false },
        ],
      });
    },
  );

  pgTest.for([
    { case: "owns no published sample", role: null, group: undefined },
    {
      case: "only contributes to a published sample of the group",
      role: "contributor",
      group: MASSIF,
    },
    {
      case: "owns a published sample attached to another group",
      role: "owner",
      group: ALPES,
    },
  ] as const)(
    "should let a caller who $case leave",
    async ({ role, group }, { db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertGroup(db, ALPES, "Alpes 2026");
      const researcher = await provisionUser(db, "researcher");
      await insertMember(db, MASSIF, researcher.id);
      if (role) {
        await publishSample(
          db,
          await insertSampleInGroup(db, researcher.id, group, role),
        );
      }
      // Act
      const res = await testClient(createApp(db).app).admin.currentUser[
        "manual-groups"
      ][":id"].$delete(
        { param: { id: MASSIF } },
        { headers: researcherHeader },
      );
      // Assert
      expect(res.status).toBe(204);
      expect(await countMembers(db, MASSIF)).toBe(0);
    },
  );

  pgTest("should answer 401 to an unauthenticated caller", async ({ db }) => {
    // Act
    const res = await createApp(db).app.request(
      "/admin/currentUser/manual-groups",
    );
    // Assert
    expect(res.status).toBe(401);
  });
});

describe("manual group creation requests", () => {
  const asSpaceManagerWithMail = async (
    db: Db,
    sendMail = vi.fn().mockResolvedValue(undefined),
  ) => {
    await insertGroup(db, MASSIF, "Massif Central 2026");
    const manager = await provisionUser(db, "manager", { status: "accepted" });
    await moderateManualGroup(db, manager.id, [MASSIF]);
    const client = testClient(
      createApp(db, { mail: { sendMail, adminUrl: ADMIN_URL } }).app,
    );
    return { client, sendMail, manager };
  };

  const insertSuperAdmins = (db: Db) =>
    Promise.all([
      insertUser(db, "root@univ-lorraine.fr", { superAdmin: true }),
      insertUser(db, "boss@univ-lorraine.fr", { superAdmin: true }),
    ]);

  pgTest(
    "should mail the requested group and managers to every super admin, and to no one else",
    async ({ db }) => {
      // Arrange
      await insertSuperAdmins(db);
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr", {
        name: "Curie",
        firstname: "Marie",
      });
      const { client, sendMail } = await asSpaceManagerWithMail(db);
      // Act
      const res = await client.admin["manual-groups"].requests.$post(
        { json: { name: "Vosges 2027", managerIds: [curie.id] } },
        { headers: managerHeader },
      );
      // Assert
      expect(res.status).toBe(204);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: ["boss@univ-lorraine.fr", "root@univ-lorraine.fr"],
            audience: "admin",
            subject: 'Test User requests the manual group "Vosges 2027"',
            text: expect.stringContaining(
              "Marie Curie (marie.curie@univ-lorraine.fr)",
            ) as unknown as string,
          }),
        ),
      );
      expect(sendMail).toHaveBeenCalledTimes(1);
    },
  );

  pgTest.for([
    { case: "an empty name", body: { name: "  ", managerIds: [UNKNOWN] } },
    {
      case: "an empty manager list",
      body: { name: "Vosges 2027", managerIds: [] },
    },
  ])("should answer 400 on $case", async ({ body }, { db }) => {
    // Arrange
    await insertSuperAdmins(db);
    const { client, sendMail } = await asSpaceManagerWithMail(db);
    // Act
    const res = await client.admin["manual-groups"].requests.$post(
      { json: body },
      { headers: managerHeader },
    );
    // Assert
    expect(res.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest("should answer 401 to an unauthenticated caller", async ({ db }) => {
    // Act
    const res = await createApp(db).app.request(
      "/admin/manual-groups/requests",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Vosges 2027", managerIds: [UNKNOWN] }),
      },
    );
    // Assert
    expect(res.status).toBe(401);
  });

  pgTest("should answer 404 on an unknown named manager", async ({ db }) => {
    // Arrange
    await insertSuperAdmins(db);
    const { client, sendMail } = await asSpaceManagerWithMail(db);
    // Act
    const res = await client.admin["manual-groups"].requests.$post(
      { json: { name: "Vosges 2027", managerIds: [UNKNOWN] } },
      { headers: managerHeader },
    );
    // Assert
    expect(res.status).toBe(404);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest("should answer 403 to a user managing nothing", async ({ db }) => {
    // Arrange
    const curie = await provisionUser(db, "researcher", {
      status: "accepted",
    });
    const { client, sendMail } = await asSpaceManagerWithMail(db);
    // Act
    const res = await client.admin["manual-groups"].requests.$post(
      { json: { name: "Vosges 2027", managerIds: [curie.id] } },
      { headers: researcherHeader },
    );
    // Assert
    expect(res.status).toBe(403);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest.for([
    { case: "the request mail cannot be sent", superAdmins: true, mails: 1 },
    { case: "no super admin can be notified", superAdmins: false, mails: 0 },
  ])(
    "should answer 204 and log when $case",
    async ({ superAdmins, mails }, { db }) => {
      // Arrange
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      if (superAdmins) await insertSuperAdmins(db);
      const { client, sendMail, manager } = await asSpaceManagerWithMail(
        db,
        vi.fn().mockRejectedValue(new Error("SMTP down")),
      );
      // Act
      const res = await client.admin["manual-groups"].requests.$post(
        { json: { name: "Vosges 2027", managerIds: [manager.id] } },
        { headers: managerHeader },
      );
      // Assert
      expect(res.status).toBe(204);
      await vi.waitFor(() => expect(logged).toHaveBeenCalled());
      expect(sendMail).toHaveBeenCalledTimes(mails);
      logged.mockRestore();
    },
  );
});
