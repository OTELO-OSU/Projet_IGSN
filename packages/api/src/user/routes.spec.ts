import type { ManagedGroups } from "@projet-igsn/domain/user/managed-groups";
import type { UpdateUser } from "@projet-igsn/domain/user/user-validator";

import { MAX_SEARCH_LENGTH } from "@projet-igsn/domain/sample/search/search-tokens";
import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import {
  adminUserResponseSchema,
  institutionalGroupCountsResponseSchema,
  listUsersResponseSchema,
  userIdentitiesResponseSchema,
} from "@projet-igsn/domain/user/user-validator";
import { type Context } from "hono";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import { createApp } from "../app.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { publishSample } from "../sample/service/publish-sample.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { moderateManualGroup } from "../tests/moderate-manual-group.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser, tokenEmail } from "../tests/provision-user.ts";
import { insertSampleCollaborator } from "../user-sample/insert-sample-collaborator.ts";

const ADMIN_URL = "http://localhost:3001/";
const FRONTEND_URL = "http://localhost:3000";

describe("admin user search routes", () => {
  const authHeader = { Authorization: "Bearer test-token" };

  pgTest("should search researchers by name", async ({ db }) => {
    await insertUser(db, "marie.curie@univ-lorraine.fr", { name: "Curie" });
    await insertUser(db, "pierre.dupont@univ-lorraine.fr", { name: "Dupont" });

    const res = await testClient(createApp(db).app).admin.users.search.$get(
      { query: { search: "curie" } },
      { headers: authHeader },
    );

    expect(res.status).toBe(200);
    const body = userIdentitiesResponseSchema.parse(await res.json());
    expect(body.data.map((user) => user.name)).toEqual(["Curie"]);
  });

  pgTest(
    "should ignore the exclusion when the caller is not on that sample",
    async ({ db }) => {
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr", {
        name: "Curie",
      });
      await insertUser(db, "pierre.dupont@univ-lorraine.fr", {
        name: "Dupont",
      });
      const sample = await insertSample(db, {
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        collectionMethod: null,
      });
      await insertSampleCollaborator(db, sample.id, curie.id, "contributor");

      const res = await testClient(createApp(db).app).admin.users.search.$get(
        { query: { excludeCollaboratorsOf: sample.id } },
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = userIdentitiesResponseSchema.parse(await res.json());
      expect(body.data.map((user) => user.name)).toEqual(["Curie", "Dupont"]);
    },
  );

  pgTest(
    "should exclude the researchers already in the group",
    async ({ db }) => {
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr", {
        name: "Curie",
      });
      await insertUser(db, "pierre.dupont@univ-lorraine.fr", {
        name: "Dupont",
      });
      const groupId = "0198f3a0-0000-7000-8000-000000000001";
      await db
        .insertInto("manual_group")
        .values({ id: groupId, name: "Alpes" })
        .execute();
      await db
        .insertInto("manual_group_member")
        .values({ group_id: groupId, user_id: curie.id })
        .execute();

      const res = await testClient(createApp(db).app).admin.users.search.$get(
        { query: { excludeMembersOf: groupId } },
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = userIdentitiesResponseSchema.parse(await res.json());
      expect(body.data.map((user) => user.name)).toEqual(["Dupont"]);
    },
  );

  pgTest.for([
    {
      case: "only the requested identities",
      query: (ids: Record<string, string>) => `ids=${ids.curie},${ids.dupont}`,
      emails: [
        "marie.curie@univ-lorraine.fr",
        "pierre.dupont@univ-lorraine.fr",
      ],
    },
    {
      case: "the caller among the requested identities",
      query: (ids: Record<string, string>) => `ids=${ids.caller},${ids.curie}`,
      emails: ["marie.curie@univ-lorraine.fr", tokenEmail("test-token")],
    },
    {
      case: "the caller when includeSelf is set",
      query: () => "includeSelf=true",
      emails: [
        "jean.martin@univ-lorraine.fr",
        "marie.curie@univ-lorraine.fr",
        "pierre.dupont@univ-lorraine.fr",
        tokenEmail("test-token"),
      ],
    },
  ])("should return $case", async ({ query, emails }, { db }) => {
    const caller = await provisionUser(db, "test-token");
    const curie = await insertUser(db, "marie.curie@univ-lorraine.fr", {
      name: "Curie",
    });
    const dupont = await insertUser(db, "pierre.dupont@univ-lorraine.fr", {
      name: "Dupont",
    });
    await insertUser(db, "jean.martin@univ-lorraine.fr", { name: "Martin" });

    const res = await createApp(db).app.request(
      `/admin/users/search?${query({
        caller: caller.id,
        curie: curie.id,
        dupont: dupont.id,
      })}`,
      { headers: authHeader },
    );

    expect(res.status).toBe(200);
    const body = userIdentitiesResponseSchema.parse(await res.json());
    expect(body.data.map((user) => user.email)).toEqual(emails);
  });

  pgTest.for([
    "search=",
    "search=c",
    "status=rejected",
    "status=unknown",
    "excludeCollaboratorsOf=not-a-uuid",
  ])("should reject the query %s with 400", async (query, { db }) => {
    const res = await createApp(db).app.request(
      `/admin/users/search?${query}`,
      {
        headers: authHeader,
      },
    );

    expect(res.status).toBe(400);
  });

  pgTest(
    "should reject a search term past the length ceiling with 400",
    async ({ db }) => {
      const res = await createApp(db).app.request(
        `/admin/users/search?search=${"a".repeat(MAX_SEARCH_LENGTH + 1)}`,
        { headers: authHeader },
      );

      expect(res.status).toBe(400);
    },
  );

  pgTest(
    "should list the users by email, caller excluded, with no search term",
    async ({ db }) => {
      await insertUser(db, "zeller@univ-lorraine.fr", { name: "Zeller" });
      await insertUser(db, "aubry@univ-lorraine.fr", { name: "Aubry" });

      const res = await createApp(db).app.request("/admin/users/search", {
        headers: authHeader,
      });

      expect(res.status).toBe(200);
      const body = userIdentitiesResponseSchema.parse(await res.json());
      expect(body.data.map((user) => user.email)).toEqual([
        "aubry@univ-lorraine.fr",
        "zeller@univ-lorraine.fr",
      ]);
    },
  );

  pgTest(
    "should omit a rejected account from the search results",
    async ({ db }) => {
      await insertUser(db, "marie.curie@univ-lorraine.fr", { name: "Curie" });
      await insertUser(db, "eve.curie@univ-lorraine.fr", {
        name: "Curie-Joliot",
        status: "rejected",
      });
      await insertUser(db, "irene.curie@univ-lorraine.fr", {
        name: "Curie-Pending",
        status: "pending",
      });

      const res = await testClient(createApp(db).app).admin.users.search.$get(
        { query: { search: "curie" } },
        { headers: authHeader },
      );

      const body = userIdentitiesResponseSchema.parse(await res.json());
      expect(body.data.map((user) => user.email)).toEqual([
        "marie.curie@univ-lorraine.fr",
        "irene.curie@univ-lorraine.fr",
      ]);
    },
  );

  pgTest(
    "should keep only the accepted accounts when status is accepted",
    async ({ db }) => {
      await insertUser(db, "marie.curie@univ-lorraine.fr", { name: "Curie" });
      await insertUser(db, "irene.curie@univ-lorraine.fr", {
        name: "Curie-Pending",
        status: "pending",
      });

      const res = await testClient(createApp(db).app).admin.users.search.$get(
        { query: { search: "curie", status: "accepted" } },
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      const body = userIdentitiesResponseSchema.parse(await res.json());
      expect(body.data.map((user) => user.email)).toEqual([
        "marie.curie@univ-lorraine.fr",
      ]);
    },
  );

  pgTest("should reject an unauthenticated search with 401", async ({ db }) => {
    const res = await createApp(db).app.request(
      "/admin/users/search?search=curie",
    );

    expect(res.status).toBe(401);
  });
});

const NO_GROUPS = {
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
};

const authHeader = { Authorization: "Bearer moderator" };

const MASSIF = "01890a5d-ac96-774b-bcce-b302099a9001";
const ALPES = "01890a5d-ac96-774b-bcce-b302099a9002";

const PENDING_ID = "01890a5d-ac96-774b-bcce-b302099a8061";
const ACCEPTED_ID = "01890a5d-ac96-774b-bcce-b302099a8062";

type Institution = {
  [K in
    | "institutionalOrganization"
    | "institutionalOsu"
    | "institutionalLaboratory"]-?: NonNullable<UpdateUser[K]>;
};

const TRIO_A: Institution = {
  institutionalOrganization: "04vfs2w97",
  institutionalOsu: "OTELo",
  institutionalLaboratory: "UMR7358",
};

const TRIO_B: Institution = {
  institutionalOrganization: "02rx3b187",
  institutionalOsu: "OSUG",
  institutionalLaboratory: "UMR5275",
};

const update = (over: Partial<UpdateUser> = {}): UpdateUser => ({
  status: "accepted",
  ...TRIO_A,
  manualGroupIds: [],
  managedGroups: NO_MANAGED_GROUPS,
  ...over,
});

const insertGroup = (
  db: Parameters<typeof createApp>[0],
  id: string,
  name: string,
) => db.insertInto("manual_group").values({ id, name }).execute();

const insertMember = (
  db: Parameters<typeof createApp>[0],
  groupId: string,
  userId: string,
) =>
  db
    .insertInto("manual_group_member")
    .values({ group_id: groupId, user_id: userId })
    .execute();

const readGroups = (db: Parameters<typeof createApp>[0], id: string) =>
  db
    .selectFrom("user")
    .select([
      "institutional_organization as institutionalOrganization",
      "institutional_osu as institutionalOsu",
      "institutional_laboratory as institutionalLaboratory",
      "status",
    ])
    .where("id", "=", id)
    .executeTakeFirstOrThrow();

const insertResearchers = (db: Parameters<typeof createApp>[0]) =>
  db
    .insertInto("user")
    .values([
      {
        id: PENDING_ID,
        email: "pending@univ-lorraine.fr",
        name: "Pending",
        firstname: "Paul",
      },
      {
        id: ACCEPTED_ID,
        email: "accepted@univ-lorraine.fr",
        name: "Accepted",
        firstname: "Anne",
        status: "accepted",
      },
    ])
    .execute();

const asSuperAdmin = async (db: Parameters<typeof createApp>[0]) => {
  await provisionUser(db, "moderator", {
    status: "accepted",
    superAdmin: true,
  });
  return testClient(createApp(db).app);
};

describe("admin user routes", () => {
  pgTest("should list every user with a total", async ({ db }) => {
    // Arrange
    await insertResearchers(db);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users.$get(
      { query: { page: "1", perPage: "25" } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    const body = listUsersResponseSchema.parse(await res.json());
    expect(body.meta.total).toBe(3);
    expect(body.data.map((user) => user.email)).toContain(
      "pending@univ-lorraine.fr",
    );
  });

  pgTest("should filter on a status, total included", async ({ db }) => {
    // Arrange
    await insertResearchers(db);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users.$get(
      { query: { page: "1", perPage: "25", status: "pending" } },
      { headers: authHeader },
    );
    // Assert
    const body = listUsersResponseSchema.parse(await res.json());
    expect(body.meta.total).toBe(1);
    expect(body.data.map((user) => user.email)).toEqual([
      "pending@univ-lorraine.fr",
    ]);
  });

  pgTest("should filter on an institutional code", async ({ db }) => {
    // Arrange
    await insertResearchers(db);
    await insertUser(db, "crpg@univ-lorraine.fr", {
      institutionalOrganization: "04vfs2w97",
      institutionalOsu: "OTELo",
      institutionalLaboratory: "UMR7358",
    });
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users.$get(
      {
        query: { page: "1", perPage: "25", institutionalLaboratory: "UMR7358" },
      },
      { headers: authHeader },
    );
    // Assert
    const body = listUsersResponseSchema.parse(await res.json());
    expect(body.meta.total).toBe(1);
    expect(body.data.map((user) => user.email)).toEqual([
      "crpg@univ-lorraine.fr",
    ]);
  });

  pgTest("should read one user", async ({ db }) => {
    // Arrange
    await insertResearchers(db);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users[":id"].$get(
      { param: { id: PENDING_ID } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(adminUserResponseSchema.parse(await res.json()).data).toEqual({
      id: PENDING_ID,
      email: "pending@univ-lorraine.fr",
      name: "Pending",
      firstname: "Paul",
      orcid: null,
      ...NO_GROUPS,
      status: "pending",
      superAdmin: false,
      manualGroups: [],
      managedGroups: NO_MANAGED_GROUPS,
    });
  });

  pgTest(
    "should carry each user's manual groups, name-ordered",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertGroup(db, ALPES, "Alpes 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      await insertUser(db, "pierre.dupont@univ-lorraine.fr");
      await insertMember(db, MASSIF, curie.id);
      await insertMember(db, ALPES, curie.id);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users.$get(
        { query: { page: "1", perPage: "25" } },
        { headers: authHeader },
      );
      // Assert
      const body = listUsersResponseSchema.parse(await res.json());
      expect(
        body.data.map((user) => [
          user.email,
          user.manualGroups.map((group) => group.name),
        ]),
      ).toEqual([
        ["marie.curie@univ-lorraine.fr", ["Alpes 2026", "Massif Central 2026"]],
        ["moderator@example.com", []],
        ["pierre.dupont@univ-lorraine.fr", []],
      ]);
    },
  );

  pgTest("should read one user's own manual groups", async ({ db }) => {
    // Arrange
    await insertGroup(db, MASSIF, "Massif Central 2026");
    await insertGroup(db, ALPES, "Alpes 2026");
    const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
    const dupont = await insertUser(db, "pierre.dupont@univ-lorraine.fr");
    await insertMember(db, MASSIF, curie.id);
    await insertMember(db, ALPES, dupont.id);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users[":id"].$get(
      { param: { id: curie.id } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(
      adminUserResponseSchema.parse(await res.json()).data.manualGroups,
    ).toEqual([{ id: MASSIF, name: "Massif Central 2026", canDetach: true }]);
  });

  pgTest(
    "should mark a membership backing a published sample undetachable",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertGroup(db, ALPES, "Alpes 2026");
      const curie = await insertUser(db, "marie.curie@univ-lorraine.fr");
      await insertMember(db, MASSIF, curie.id);
      await insertMember(db, ALPES, curie.id);
      const sample = await insertSample(db, {
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        collectionMethod: null,
      });
      await db
        .insertInto("user_sample")
        .values({ sample_id: sample.id, user_id: curie.id, role: "owner" })
        .execute();
      await db
        .insertInto("sample_manual_group")
        .values({ sample_id: sample.id, group_id: MASSIF })
        .execute();
      await publishSample(db, sample.id);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$get(
        { param: { id: curie.id } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        adminUserResponseSchema.parse(await res.json()).data.manualGroups,
      ).toEqual([
        { id: ALPES, name: "Alpes 2026", canDetach: true },
        { id: MASSIF, name: "Massif Central 2026", canDetach: false },
      ]);
    },
  );

  pgTest(
    "should set the status, the institution and the groups in one request",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const target = await insertUser(db, "crpg@univ-lorraine.fr", {
        status: "accepted",
        ...TRIO_A,
      });
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: target.id },
          json: update({ ...TRIO_B, manualGroupIds: [MASSIF] }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(adminUserResponseSchema.parse(await res.json()).data).toEqual({
        id: target.id,
        email: "crpg@univ-lorraine.fr",
        name: null,
        firstname: null,
        orcid: null,
        ...TRIO_B,
        status: "accepted",
        superAdmin: false,
        manualGroups: [
          { id: MASSIF, name: "Massif Central 2026", canDetach: true },
        ],
        managedGroups: NO_MANAGED_GROUPS,
      });
      await expect(readGroups(db, target.id)).resolves.toEqual({
        ...TRIO_B,
        status: "accepted",
      });
    },
  );

  pgTest("should detach the groups left out of the request", async ({ db }) => {
    // Arrange
    await insertGroup(db, MASSIF, "Massif Central 2026");
    await insertGroup(db, ALPES, "Alpes 2026");
    const target = await insertUser(db, "crpg@univ-lorraine.fr", {
      status: "accepted",
      ...TRIO_A,
    });
    await insertMember(db, MASSIF, target.id);
    await insertMember(db, ALPES, target.id);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users[":id"].$put(
      {
        param: { id: target.id },
        json: update({ ...TRIO_A, manualGroupIds: [ALPES] }),
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(
      adminUserResponseSchema.parse(await res.json()).data.manualGroups,
    ).toEqual([{ id: ALPES, name: "Alpes 2026", canDetach: true }]);
  });

  pgTest("should keep an unmoderated account pending", async ({ db }) => {
    // Arrange
    await insertResearchers(db);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users[":id"].$put(
      {
        param: { id: PENDING_ID },
        json: update({ status: "pending" }),
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    await expect(readGroups(db, PENDING_ID)).resolves.toEqual({
      ...TRIO_A,
      status: "pending",
    });
  });

  pgTest(
    "should answer 422 when putting a moderated account back to pending",
    async ({ db }) => {
      // Arrange
      await insertResearchers(db);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: ACCEPTED_ID },
          json: update({ status: "pending" }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(422);
      await expect(readGroups(db, ACCEPTED_ID)).resolves.toEqual({
        ...NO_GROUPS,
        status: "accepted",
      });
    },
  );

  pgTest(
    "should answer 422 when attaching a group to an account it does not accept",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertResearchers(db);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: PENDING_ID },
          json: update({ status: "rejected", manualGroupIds: [MASSIF] }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(422);
      await expect(readGroups(db, PENDING_ID)).resolves.toEqual({
        ...NO_GROUPS,
        status: "pending",
      });
    },
  );

  pgTest("should answer 404 for an unknown manual group", async ({ db }) => {
    // Arrange
    await insertResearchers(db);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users[":id"].$put(
      {
        param: { id: PENDING_ID },
        json: update({ manualGroupIds: [MASSIF] }),
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(404);
    await expect(readGroups(db, PENDING_ID)).resolves.toEqual({
      ...NO_GROUPS,
      status: "pending",
    });
  });

  pgTest(
    "should answer 400 when the OSU is outside the submitted organization",
    async ({ db }) => {
      // Arrange
      const target = await insertUser(db, "crpg@univ-lorraine.fr", {
        status: "accepted",
        ...TRIO_A,
      });
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: target.id },
          json: update({ ...TRIO_A, institutionalOsu: "OSUG" }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(400);
      await expect(readGroups(db, target.id)).resolves.toEqual({
        ...TRIO_A,
        status: "accepted",
      });
    },
  );

  pgTest(
    "should answer 400 when the institution is left out of the payload",
    async ({ db }) => {
      // Arrange
      await insertResearchers(db);
      await asSuperAdmin(db);
      // Act
      const res = await createApp(db).app.request(
        `/admin/users/${ACCEPTED_ID}`,
        {
          method: "PUT",
          headers: { ...authHeader, "content-type": "application/json" },
          body: JSON.stringify({ status: "accepted", manualGroupIds: [] }),
        },
      );
      // Assert
      expect(res.status).toBe(400);
      await expect(readGroups(db, ACCEPTED_ID)).resolves.toEqual({
        ...NO_GROUPS,
        status: "accepted",
      });
    },
  );

  pgTest("should answer 404 when updating an unknown user", async ({ db }) => {
    // Arrange
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users[":id"].$put(
      { param: { id: "01890a5d-ac96-774b-bcce-b302099a8099" }, json: update() },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "User not found" });
  });

  pgTest(
    "should re-pend the account whose institution the update clears",
    async ({ db }) => {
      // Arrange
      const target = await insertUser(db, "crpg@univ-lorraine.fr", {
        status: "accepted",
        ...TRIO_A,
      });
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: target.id },
          json: update({ status: "accepted", ...NO_GROUPS }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(adminUserResponseSchema.parse(await res.json()).data.status).toBe(
        "pending",
      );
      await expect(readGroups(db, target.id)).resolves.toEqual({
        ...NO_GROUPS,
        status: "pending",
      });
    },
  );

  pgTest(
    "should strip the institution and re-pend the account",
    async ({ db }) => {
      // Arrange
      const target = await insertUser(db, "crpg@univ-lorraine.fr", {
        status: "accepted",
        ...TRIO_A,
      });
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"][
        "institutional-groups"
      ].$delete({ param: { id: target.id } }, { headers: authHeader });
      // Assert
      expect(res.status).toBe(204);
      await expect(readGroups(db, target.id)).resolves.toEqual({
        ...NO_GROUPS,
        status: "pending",
      });
    },
  );

  pgTest(
    "should keep the status of an account already without institution",
    async ({ db }) => {
      // Arrange
      await insertResearchers(db);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"][
        "institutional-groups"
      ].$delete({ param: { id: ACCEPTED_ID } }, { headers: authHeader });
      // Assert
      expect(res.status).toBe(204);
      await expect(readGroups(db, ACCEPTED_ID)).resolves.toEqual({
        ...NO_GROUPS,
        status: "accepted",
      });
    },
  );

  pgTest(
    "should answer 404 stripping the institution of an unknown user",
    async ({ db }) => {
      // Arrange
      await asSuperAdmin(db);
      // Act
      const res = await createApp(db).app.request(
        "/admin/users/01890a5d-ac96-774b-bcce-b302099a8099/institutional-groups",
        { method: "DELETE", headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "User not found" });
    },
  );

  pgTest("should answer 404 for an unknown user", async ({ db }) => {
    // Arrange
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users[":id"].$get(
      { param: { id: "01890a5d-ac96-774b-bcce-b302099a8099" } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest("should reject a malformed user id with 400", async ({ db }) => {
    // Arrange
    await asSuperAdmin(db);
    // Act
    const res = await createApp(db).app.request("/admin/users/not-a-uuid", {
      headers: authHeader,
    });
    // Assert
    expect(res.status).toBe(400);
  });

  pgTest.for([
    ["pending", PENDING_ID, "pending"],
    ["rejected", "01890a5d-ac96-774b-bcce-b302099a8063", "rejected"],
  ] as const)(
    "should notify the user accepted from %s",
    async ([, id, mailbox], { db }) => {
      // Arrange
      await insertResearchers(db);
      await db
        .insertInto("user")
        .values({
          id: "01890a5d-ac96-774b-bcce-b302099a8063",
          email: "rejected@univ-lorraine.fr",
          name: "Rejected",
          firstname: "Rose",
          status: "rejected",
        })
        .execute();
      await provisionUser(db, "moderator", {
        status: "accepted",
        superAdmin: true,
      });
      const sendMail = vi.fn().mockResolvedValue(undefined);
      const client = testClient(
        createApp(db, {
          mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
        }).app,
      );
      // Act
      const res = await client.admin.users[":id"].$put(
        { param: { id }, json: update() },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: [`${mailbox}@univ-lorraine.fr`],
            subject: "Your account has been activated",
          }),
        ),
      );
    },
  );

  pgTest.for([
    ["a rejected pending user", PENDING_ID, "rejected"],
    ["an already accepted user", ACCEPTED_ID, "accepted"],
  ] as const)("should not notify %s", async ([, id, status], { db }) => {
    // Arrange
    await insertResearchers(db);
    await provisionUser(db, "moderator", {
      status: "accepted",
      superAdmin: true,
    });
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const client = testClient(
      createApp(db, {
        mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
      }).app,
    );
    // Act
    const res = await client.admin.users[":id"].$put(
      { param: { id }, json: update({ status }) },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest("should invite the user to a group it joins", async ({ db }) => {
    // Arrange
    await insertGroup(db, MASSIF, "Massif Central 2026");
    await insertResearchers(db);
    await provisionUser(db, "moderator", {
      status: "accepted",
      superAdmin: true,
    });
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const client = testClient(
      createApp(db, {
        mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
      }).app,
    );
    // Act
    const res = await client.admin.users[":id"].$put(
      {
        param: { id: ACCEPTED_ID },
        json: update({ manualGroupIds: [MASSIF] }),
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    await vi.waitFor(() =>
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: ["accepted@univ-lorraine.fr"] }),
      ),
    );
  });

  pgTest(
    "should answer 200 when the acceptance mail cannot be sent",
    async ({ db }) => {
      // Arrange
      await insertResearchers(db);
      await provisionUser(db, "moderator", {
        status: "accepted",
        superAdmin: true,
      });
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      const sendMail = vi.fn().mockRejectedValue(new Error("SMTP down"));
      const client = testClient(
        createApp(db, {
          mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
        }).app,
      );
      // Act
      const res = await client.admin.users[":id"].$put(
        { param: { id: PENDING_ID }, json: update() },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      await vi.waitFor(() => expect(logged).toHaveBeenCalled());
      logged.mockRestore();
    },
  );

  pgTest(
    "should trace the decision with both ids, no email",
    async ({ db }) => {
      // Arrange
      await insertResearchers(db);
      const moderator = await provisionUser(db, "moderator", {
        status: "accepted",
        superAdmin: true,
      });
      const info = vi
        .spyOn(console, "info")
        .mockImplementation(() => undefined);
      // Act
      await testClient(createApp(db).app).admin.users[":id"].$put(
        { param: { id: PENDING_ID }, json: update() },
        { headers: authHeader },
      );
      // Assert
      expect(info).toHaveBeenCalledWith("user status changed", {
        actor: moderator.id,
        target: PENDING_ID,
        status: "accepted",
      });
      info.mockRestore();
    },
  );

  pgTest(
    "should trace a membership the account leaves with ids only",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertResearchers(db);
      await insertMember(db, MASSIF, ACCEPTED_ID);
      const moderator = await provisionUser(db, "moderator", {
        status: "accepted",
        superAdmin: true,
      });
      const info = vi
        .spyOn(console, "info")
        .mockImplementation(() => undefined);
      // Act
      await testClient(createApp(db).app).admin.users[":id"].$put(
        { param: { id: ACCEPTED_ID }, json: update({ manualGroupIds: [] }) },
        { headers: authHeader },
      );
      // Assert
      expect(info).toHaveBeenCalledWith("manual group membership changed", {
        actor: moderator.id,
        group: MASSIF,
        target: ACCEPTED_ID,
      });
      info.mockRestore();
    },
  );

  pgTest(
    "should answer 409 detaching a member owning a published sample of the group",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertResearchers(db);
      await insertMember(db, MASSIF, ACCEPTED_ID);
      const sample = await insertSample(db, {
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        collectionMethod: null,
      });
      await db
        .insertInto("user_sample")
        .values({ sample_id: sample.id, user_id: ACCEPTED_ID, role: "owner" })
        .execute();
      await db
        .insertInto("sample_manual_group")
        .values({ sample_id: sample.id, group_id: MASSIF })
        .execute();
      await publishSample(db, sample.id);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$put(
        { param: { id: ACCEPTED_ID }, json: update({ manualGroupIds: [] }) },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(409);
      await expect(
        db
          .selectFrom("manual_group_member")
          .select("user_id")
          .where("group_id", "=", MASSIF)
          .execute(),
      ).resolves.toEqual([{ user_id: ACCEPTED_ID }]);
    },
  );

  pgTest(
    "should answer 400 for a status outside the vocabulary",
    async ({ db }) => {
      // Arrange
      await insertResearchers(db);
      await asSuperAdmin(db);
      // Act
      const res = await createApp(db).app.request(
        `/admin/users/${PENDING_ID}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json", ...authHeader },
          body: JSON.stringify({ ...update(), status: "banned" }),
        },
      );
      // Assert
      expect(res.status).toBe(400);
      await expect(readGroups(db, PENDING_ID)).resolves.toEqual({
        ...NO_GROUPS,
        status: "pending",
      });
    },
  );

  pgTest("should refuse an update on a revoked session", async ({ db }) => {
    // Arrange
    await insertResearchers(db);
    const client = await asSuperAdmin(db);
    const revoked = async (c: Context) =>
      c.json({ error: "Unauthorized" }, 401);
    vi.mocked(requireActiveSession)
      .mockImplementationOnce(revoked)
      .mockImplementationOnce(revoked);
    // Act
    const res = await client.admin.users[":id"].$put(
      { param: { id: PENDING_ID }, json: update() },
      { headers: authHeader },
    );
    const removal = await client.admin.users[":id"][
      "institutional-groups"
    ].$delete({ param: { id: PENDING_ID } }, { headers: authHeader });
    // Assert
    expect([res.status, removal.status]).toEqual([401, 401]);
    await expect(readGroups(db, PENDING_ID)).resolves.toEqual({
      ...NO_GROUPS,
      status: "pending",
    });
  });

  describe("authorization", () => {
    pgTest.for(["accepted", "pending"] as const)(
      "should answer 403 to a %s user who is not super admin",
      async (status, { db }) => {
        // Arrange
        await provisionUser(db, "moderator", { status });
        const client = testClient(createApp(db).app);
        // Act
        const list = await client.admin.users.$get(
          { query: { page: "1", perPage: "25" } },
          { headers: authHeader },
        );
        const put = await client.admin.users[":id"].$put(
          { param: { id: PENDING_ID }, json: update() },
          { headers: authHeader },
        );
        const removal = await client.admin.users[":id"][
          "institutional-groups"
        ].$delete({ param: { id: PENDING_ID } }, { headers: authHeader });
        // Assert
        expect([list.status, put.status, removal.status]).toEqual([
          403, 403, 403,
        ]);
      },
    );

    pgTest("should answer 401 to an unauthenticated caller", async ({ db }) => {
      // Act
      const res = await createApp(db).app.request("/admin/users");
      const put = await createApp(db).app.request(
        `/admin/users/${PENDING_ID}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(update()),
        },
      );
      const removal = await createApp(db).app.request(
        `/admin/users/${PENDING_ID}/institutional-groups`,
        { method: "DELETE" },
      );
      // Assert
      expect([res.status, put.status, removal.status]).toEqual([401, 401, 401]);
    });
  });
});

const TRIO_C: Institution = {
  institutionalOrganization: "04vfs2w97",
  institutionalOsu: "OTELo",
  institutionalLaboratory: "UMR7359",
};

const ORGANIZATION_WITHOUT_LABORATORY = "03fd77x13";

type Db = Parameters<typeof createApp>[0];

describe("space manager moderation", () => {
  const asManager = async (
    db: Db,
    scope: { kind: "organization" | "osu" | "laboratory"; code: string },
    overrides: Parameters<typeof insertUser>[2] = {},
  ) => {
    const manager = await insertUser(db, tokenEmail("moderator"), {
      status: "accepted",
      ...overrides,
    });
    await moderateInstitution(db, manager.id, scope);
    return { manager, client: testClient(createApp(db).app) };
  };

  const asGroupManager = async (db: Db, groupIds: string[]) => {
    const manager = await insertUser(db, tokenEmail("moderator"), {
      status: "accepted",
    });
    await moderateManualGroup(db, manager.id, groupIds);
    return { client: testClient(createApp(db).app) };
  };

  const asDualManager = async (db: Db, groupIds: string[]) => {
    const { manager, client } = await asManager(db, {
      kind: "osu",
      code: "OSUG",
    });
    await moderateManualGroup(db, manager.id, groupIds);
    return { client };
  };

  type ModerationClient = Awaited<ReturnType<typeof asDualManager>>["client"];

  const callUserRoute = (client: ModerationClient, id: string) => ({
    list: () =>
      client.admin.users.$get(
        { query: { page: "1", perPage: "25" } },
        { headers: authHeader },
      ),
    read: () =>
      client.admin.users[":id"].$get(
        { param: { id } },
        { headers: authHeader },
      ),
    update: () =>
      client.admin.users[":id"].$put(
        { param: { id }, json: update() },
        { headers: authHeader },
      ),
  });

  pgTest(
    "should list only the users the institutional scope covers",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "inside@univ-lorraine.fr", {
        institutionalOrganization: "04vfs2w97",
        institutionalOsu: "OTELo",
        institutionalLaboratory: "UMR7358",
      });
      await insertUser(db, "outside@univ-grenoble.fr", {
        institutionalOrganization: "02rx3b187",
        institutionalOsu: "OSUG",
        institutionalLaboratory: "UMR5275",
      });
      const { client } = await asManager(db, { kind: "osu", code: "OTELo" });
      // Act
      const res = await client.admin.users.$get(
        { query: { page: "1", perPage: "25" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      const body = listUsersResponseSchema.parse(await res.json());
      expect(body.data.map((user) => user.email)).toEqual([
        "inside@univ-lorraine.fr",
      ]);
      expect(body.meta.total).toBe(1);
    },
  );

  pgTest.for(["list", "read", "update"] as const)(
    "should answer 403 when a manual group manager tries to %s a user",
    async (route, { db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const member = await insertUser(db, "member@univ-lorraine.fr");
      await insertMember(db, MASSIF, member.id);
      const { client } = await asGroupManager(db, [MASSIF]);
      // Act
      const res = await callUserRoute(client, member.id)[route]();
      // Assert
      expect(res.status).toBe(403);
    },
  );

  pgTest(
    "should answer 403 when the scope resolves to no laboratory",
    async ({ db }) => {
      // Arrange
      await insertResearchers(db);
      const { client } = await asManager(db, {
        kind: "organization",
        code: ORGANIZATION_WITHOUT_LABORATORY,
      });
      // Act
      const res = await client.admin.users.$get(
        { query: { page: "1", perPage: "25" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(403);
    },
  );

  pgTest(
    "should hide the caller and any super admin from the list",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "peer@univ-lorraine.fr", {
        institutionalLaboratory: "UMR7358",
      });
      await insertUser(db, "boss@univ-lorraine.fr", {
        superAdmin: true,
        institutionalLaboratory: "UMR7358",
      });
      const { client } = await asManager(
        db,
        { kind: "osu", code: "OTELo" },
        { institutionalLaboratory: "UMR7358" },
      );
      // Act
      const res = await client.admin.users.$get(
        { query: { page: "1", perPage: "25" } },
        { headers: authHeader },
      );
      // Assert
      const body = listUsersResponseSchema.parse(await res.json());
      expect(body.data.map((user) => user.email)).toEqual([
        "peer@univ-lorraine.fr",
      ]);
    },
  );

  pgTest("should narrow a status filter within the scope", async ({ db }) => {
    // Arrange
    await insertUser(db, "inside-pending@univ-lorraine.fr", {
      status: "pending",
      institutionalLaboratory: "UMR7358",
    });
    await insertUser(db, "inside-accepted@univ-lorraine.fr", {
      institutionalLaboratory: "UMR7358",
    });
    await insertUser(db, "outside-pending@univ-grenoble.fr", {
      status: "pending",
      institutionalLaboratory: "UMR5275",
    });
    const { client } = await asManager(db, { kind: "osu", code: "OTELo" });
    // Act
    const res = await client.admin.users.$get(
      { query: { page: "1", perPage: "25", status: "pending" } },
      { headers: authHeader },
    );
    // Assert
    const body = listUsersResponseSchema.parse(await res.json());
    expect(body.data.map((user) => user.email)).toEqual([
      "inside-pending@univ-lorraine.fr",
    ]);
    expect(body.meta.total).toBe(1);
  });

  pgTest(
    "should answer 403 to a manager whose account is not accepted",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "inside@univ-lorraine.fr", {
        institutionalLaboratory: "UMR7358",
      });
      const { client } = await asManager(
        db,
        { kind: "osu", code: "OTELo" },
        { status: "pending" },
      );
      // Act
      const res = await client.admin.users.$get(
        { query: { page: "1", perPage: "25" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(403);
    },
  );

  pgTest("should answer 404 reading an out-of-scope user", async ({ db }) => {
    // Arrange
    const outside = await insertUser(db, "outside@univ-grenoble.fr", {
      institutionalLaboratory: "UMR5275",
    });
    const { client } = await asManager(db, { kind: "osu", code: "OTELo" });
    // Act
    const res = await client.admin.users[":id"].$get(
      { param: { id: outside.id } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest(
    "should set the status and the institution of an in-scope user",
    async ({ db }) => {
      // Arrange
      const target = await insertUser(db, "inside@univ-lorraine.fr", {
        status: "pending",
        institutionalOrganization: "04vfs2w97",
        institutionalOsu: "OTELo",
        institutionalLaboratory: "UMR7358",
      });
      const { client } = await asManager(db, { kind: "osu", code: "OTELo" });
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: target.id },
          json: update({ status: "accepted", ...TRIO_C }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(adminUserResponseSchema.parse(await res.json()).data).toEqual({
        id: target.id,
        email: "inside@univ-lorraine.fr",
        name: null,
        firstname: null,
        orcid: null,
        ...TRIO_C,
        status: "accepted",
        superAdmin: false,
        manualGroups: [],
        managedGroups: NO_MANAGED_GROUPS,
      });
    },
  );

  pgTest(
    "should keep the managed groups and the memberships of an in-scope user",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertGroup(db, ALPES, "Alpes 2026");
      const target = await insertUser(db, "inside@univ-lorraine.fr", {
        institutionalLaboratory: "UMR7358",
      });
      await insertMember(db, MASSIF, target.id);
      await moderateManualGroup(db, target.id, [ALPES]);
      const { client } = await asManager(db, { kind: "osu", code: "OTELo" });
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: target.id },
          json: update({
            manualGroupIds: [MASSIF],
            managedGroups: {
              ...NO_MANAGED_GROUPS,
              manualGroupIds: [ALPES],
            },
          }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      const { data } = adminUserResponseSchema.parse(await res.json());
      expect(data.manualGroups).toEqual([
        { id: MASSIF, name: "Massif Central 2026", canDetach: true },
      ]);
      expect(data.managedGroups).toEqual({
        ...NO_MANAGED_GROUPS,
        manualGroupIds: [ALPES],
      });
    },
  );

  pgTest.for<[string, ManagedGroups, string[]]>([
    ["the managed groups", { ...NO_MANAGED_GROUPS, osus: ["OTELo"] }, []],
    ["a membership", NO_MANAGED_GROUPS, [MASSIF]],
  ])(
    "should drop %s a manager may not alter and apply the rest",
    async ([, managedGroups, manualGroupIds], { db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const target = await insertUser(db, "inside@univ-lorraine.fr", {
        institutionalLaboratory: "UMR7358",
      });
      const { client } = await asManager(db, { kind: "osu", code: "OTELo" });
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: target.id },
          json: update({ managedGroups, manualGroupIds }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      const { data } = adminUserResponseSchema.parse(await res.json());
      expect(data.managedGroups).toEqual(NO_MANAGED_GROUPS);
      expect(data.manualGroups).toEqual([]);
      await expect(readGroups(db, target.id)).resolves.toEqual({
        ...TRIO_A,
        status: "accepted",
      });
    },
  );

  pgTest(
    "should strip the institution of an in-scope user and re-pend it",
    async ({ db }) => {
      // Arrange
      const target = await insertUser(db, "inside@univ-lorraine.fr", {
        status: "accepted",
        ...TRIO_A,
      });
      const { client } = await asManager(db, { kind: "osu", code: "OTELo" });
      // Act
      const res = await client.admin.users[":id"][
        "institutional-groups"
      ].$delete({ param: { id: target.id } }, { headers: authHeader });
      // Assert
      expect(res.status).toBe(204);
      await expect(readGroups(db, target.id)).resolves.toEqual({
        ...NO_GROUPS,
        status: "pending",
      });
    },
  );

  pgTest(
    "should answer 403 stripping the institution of an out-of-scope user",
    async ({ db }) => {
      // Arrange
      const outside = await insertUser(db, "outside@univ-grenoble.fr", {
        status: "accepted",
        ...TRIO_B,
      });
      const { client } = await asManager(db, { kind: "osu", code: "OTELo" });
      // Act
      const res = await client.admin.users[":id"][
        "institutional-groups"
      ].$delete({ param: { id: outside.id } }, { headers: authHeader });
      // Assert
      expect(res.status).toBe(403);
      await expect(readGroups(db, outside.id)).resolves.toEqual({
        ...TRIO_B,
        status: "accepted",
      });
    },
  );

  pgTest.for(["an out-of-scope user", "itself", "a super admin"] as const)(
    "should answer 403 when a manager updates %s",
    async (target, { db }) => {
      // Arrange
      const outside = await insertUser(db, "outside@univ-grenoble.fr", {
        institutionalLaboratory: "UMR5275",
      });
      const boss = await insertUser(db, "boss@univ-lorraine.fr", {
        superAdmin: true,
        institutionalLaboratory: "UMR7358",
      });
      const { manager, client } = await asManager(
        db,
        { kind: "osu", code: "OTELo" },
        { institutionalLaboratory: "UMR7358" },
      );
      const id = {
        "an out-of-scope user": outside.id,
        itself: manager.id,
        "a super admin": boss.id,
      }[target];
      // Act
      const res = await client.admin.users[":id"].$put(
        { param: { id }, json: update() },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(403);
    },
  );

  pgTest(
    "should let a super admin set a scope that round-trips",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const target = await insertUser(db, "inside@univ-lorraine.fr", {
        institutionalLaboratory: "UMR7358",
      });
      const client = await asSuperAdmin(db);
      const managedGroups = {
        organizations: ["04vfs2w97"],
        osus: ["OTELo"],
        laboratories: ["UMR7358"],
        manualGroupIds: [MASSIF],
      };
      // Act
      const res = await client.admin.users[":id"].$put(
        { param: { id: target.id }, json: update({ managedGroups }) },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      const read = await client.admin.users[":id"].$get(
        { param: { id: target.id } },
        { headers: authHeader },
      );
      expect(
        adminUserResponseSchema.parse(await read.json()).data.managedGroups,
      ).toEqual(managedGroups);
    },
  );

  pgTest(
    "should move a user to an institution the manager does not manage",
    async ({ db }) => {
      // Arrange
      const target = await insertUser(db, "inside@univ-lorraine.fr", {
        ...TRIO_A,
      });
      const { client } = await asManager(db, { kind: "osu", code: "OTELo" });
      // Act
      const res = await client.admin.users[":id"].$put(
        { param: { id: target.id }, json: update(TRIO_B) },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      await expect(readGroups(db, target.id)).resolves.toEqual({
        ...TRIO_B,
        status: "accepted",
      });
    },
  );

  pgTest(
    "should let a dual manager attach and detach the groups it manages",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertGroup(db, ALPES, "Alpes 2026");
      const target = await insertUser(db, "member@univ-grenoble.fr", {
        ...TRIO_B,
      });
      await insertMember(db, MASSIF, target.id);
      const { client } = await asDualManager(db, [MASSIF, ALPES]);
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: target.id },
          json: update({ ...TRIO_B, manualGroupIds: [ALPES] }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        adminUserResponseSchema.parse(await res.json()).data.manualGroups,
      ).toEqual([{ id: ALPES, name: "Alpes 2026", canDetach: true }]);
    },
  );

  pgTest(
    "should drop a group it does not manage from a dual manager",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      await insertGroup(db, ALPES, "Alpes 2026");
      const target = await insertUser(db, "member@univ-grenoble.fr", {
        ...TRIO_B,
      });
      await insertMember(db, MASSIF, target.id);
      const { client } = await asDualManager(db, [MASSIF]);
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: target.id },
          json: update({ ...TRIO_B, manualGroupIds: [MASSIF, ALPES] }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        adminUserResponseSchema.parse(await res.json()).data.manualGroups,
      ).toEqual([{ id: MASSIF, name: "Massif Central 2026", canDetach: true }]);
    },
  );

  pgTest.for<["read" | "update", number]>([
    ["read", 404],
    ["update", 403],
  ])(
    "should refuse to %s a user a dual manager only reaches by a manual group",
    async ([route, status], { db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const member = await insertUser(db, "member@univ-lorraine.fr", {
        ...TRIO_A,
      });
      await insertMember(db, MASSIF, member.id);
      const { client } = await asDualManager(db, [MASSIF]);
      // Act
      const res = await callUserRoute(client, member.id)[route]();
      // Assert
      expect(res.status).toBe(status);
    },
  );

  pgTest(
    "should list for a dual manager only the users its institutional scope covers",
    async ({ db }) => {
      // Arrange
      await insertGroup(db, MASSIF, "Massif Central 2026");
      const member = await insertUser(db, "member@univ-lorraine.fr", {
        ...TRIO_A,
      });
      await insertMember(db, MASSIF, member.id);
      await insertUser(db, "inside@univ-grenoble.fr", { ...TRIO_B });
      const { client } = await asDualManager(db, [MASSIF]);
      // Act
      const res = await client.admin.users.$get(
        { query: { page: "1", perPage: "25" } },
        { headers: authHeader },
      );
      // Assert
      const body = listUsersResponseSchema.parse(await res.json());
      expect(body.data.map((user) => user.email)).toEqual([
        "inside@univ-grenoble.fr",
      ]);
    },
  );

  pgTest(
    "should answer 404 setting an unknown managed manual group",
    async ({ db }) => {
      // Arrange
      const target = await insertUser(db, "inside@univ-lorraine.fr");
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].$put(
        {
          param: { id: target.id },
          json: update({
            managedGroups: {
              ...NO_MANAGED_GROUPS,
              manualGroupIds: [MASSIF],
            },
          }),
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(404);
    },
  );
});

describe("admin institutional counts route", () => {
  pgTest(
    "should count the users per organisme, OSU and laboratory",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "alice@univ-lorraine.fr", {
        institutionalOrganization: "04vfs2w97",
        institutionalOsu: "OTELo",
        institutionalLaboratory: "UMR7358",
      });
      await insertUser(db, "bruno@univ-lorraine.fr", {
        institutionalOrganization: "04vfs2w97",
        institutionalLaboratory: "UMR7358",
      });
      await insertUser(db, "carla@univ-grenoble.fr", {
        institutionalOrganization: "02rx3b187",
        institutionalOsu: "OSUG",
        institutionalLaboratory: "UMR5275",
      });
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users["institutional-counts"].$get(
        {},
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      const body = institutionalGroupCountsResponseSchema.parse(
        await res.json(),
      );
      expect(body.data).toEqual({
        organizations: { "04vfs2w97": 2, "02rx3b187": 1 },
        osus: { OTELo: 1, OSUG: 1 },
        laboratories: { UMR7358: 2, UMR5275: 1 },
      });
    },
  );

  pgTest("should refuse a caller who is not a super admin", async ({ db }) => {
    // Arrange
    await provisionUser(db, "moderator", { status: "accepted" });
    const client = testClient(createApp(db).app);
    // Act
    const res = await client.admin.users["institutional-counts"].$get(
      {},
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(403);
  });
});
