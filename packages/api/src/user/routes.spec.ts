import { MAX_SEARCH_LENGTH } from "@projet-igsn/domain/sample/search/search-tokens";
import {
  listUsersResponseSchema,
  userIdentitiesResponseSchema,
  userResponseSchema,
} from "@projet-igsn/domain/user/user-validator";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import { createApp } from "../app.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { insertSample } from "../sample/service/insert-sample.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { insertSampleCollaborator } from "../user-sample/insert-sample-collaborator.ts";
import { createUserRepository } from "./repository.ts";

const ADMIN_URL = "http://localhost:3001/";

describe("admin user search routes", () => {
  const authHeader = { Authorization: "Bearer test-token" };

  async function insertResearcher(
    db: Parameters<typeof createApp>[0],
    name: string,
    email: string,
  ) {
    await createUserRepository(db).upsert({ email, name, firstname: null });
  }

  pgTest("should search researchers by name", async ({ db }) => {
    await insertResearcher(db, "Curie", "marie.curie@univ-lorraine.fr");
    await insertResearcher(db, "Dupont", "pierre.dupont@univ-lorraine.fr");

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
      const curie = await createUserRepository(db).upsert({
        email: "marie.curie@univ-lorraine.fr",
        name: "Curie",
        firstname: null,
      });
      await insertResearcher(db, "Dupont", "pierre.dupont@univ-lorraine.fr");
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
    "should reject a malformed excluded sample id with 400",
    async ({ db }) => {
      const res = await createApp(db).app.request(
        "/admin/users/search?excludeCollaboratorsOf=not-a-uuid",
        { headers: authHeader },
      );

      expect(res.status).toBe(400);
    },
  );

  pgTest.for(["", "c"])(
    "should reject the search term %s with 400",
    async (search, { db }) => {
      const res = await createApp(db).app.request(
        `/admin/users/search?search=${search}`,
        {
          headers: authHeader,
        },
      );

      expect(res.status).toBe(400);
    },
  );

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

  pgTest("should exclude the caller from the results", async ({ db }) => {
    await insertResearcher(db, "User", "another.user@univ-lorraine.fr");

    const res = await testClient(createApp(db).app).admin.users.search.$get(
      { query: { search: "user" } },
      { headers: authHeader },
    );

    const body = userIdentitiesResponseSchema.parse(await res.json());
    expect(body.data.map((user) => user.email)).toEqual([
      "another.user@univ-lorraine.fr",
    ]);
  });

  pgTest(
    "should list the users by email, caller excluded, with no search term",
    async ({ db }) => {
      await insertResearcher(db, "Zeller", "zeller@univ-lorraine.fr");
      await insertResearcher(db, "Aubry", "aubry@univ-lorraine.fr");

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

  pgTest("should reject an unauthenticated search with 401", async ({ db }) => {
    const res = await createApp(db).app.request(
      "/admin/users/search?search=curie",
    );

    expect(res.status).toBe(401);
  });
});

// requireAuth is stubbed suite-wide in test/setup.ts to gate on the Authorization
// header, and the bearer value stands for the user (see provisionUser).
const NO_GROUPS = {
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
};

const authHeader = { Authorization: "Bearer moderator" };

const insertResearchers = (db: Parameters<typeof createApp>[0]) =>
  db
    .insertInto("user")
    .values([
      {
        id: "01890a5d-ac96-774b-bcce-b302099a8061",
        email: "pending@univ-lorraine.fr",
        name: "Pending",
        firstname: "Paul",
      },
      {
        id: "01890a5d-ac96-774b-bcce-b302099a8062",
        email: "accepted@univ-lorraine.fr",
        name: "Accepted",
        firstname: "Anne",
        status: "accepted",
      },
    ])
    .execute();

describe("admin user routes", () => {
  const asSuperAdmin = async (db: Parameters<typeof createApp>[0]) => {
    await provisionUser(db, "moderator", {
      status: "accepted",
      superAdmin: true,
    });
    return testClient(createApp(db).app);
  };

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

  pgTest("should read one user", async ({ db }) => {
    // Arrange
    await insertResearchers(db);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users[":id"].$get(
      { param: { id: "01890a5d-ac96-774b-bcce-b302099a8061" } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(userResponseSchema.parse(await res.json()).data).toEqual({
      id: "01890a5d-ac96-774b-bcce-b302099a8061",
      email: "pending@univ-lorraine.fr",
      name: "Pending",
      firstname: "Paul",
      orcid: null,
      ...NO_GROUPS,
      status: "pending",
      superAdmin: false,
    });
  });

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

  pgTest("should accept a pending user", async ({ db }) => {
    // Arrange
    await insertResearchers(db);
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users[":id"].status.$put(
      {
        param: { id: "01890a5d-ac96-774b-bcce-b302099a8061" },
        json: { status: "accepted" },
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(userResponseSchema.parse(await res.json()).data).toEqual({
      id: "01890a5d-ac96-774b-bcce-b302099a8061",
      email: "pending@univ-lorraine.fr",
      name: "Pending",
      firstname: "Paul",
      orcid: null,
      ...NO_GROUPS,
      status: "accepted",
      superAdmin: false,
    });
    await expect(
      db
        .selectFrom("user")
        .select("status")
        .where("id", "=", "01890a5d-ac96-774b-bcce-b302099a8061")
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({ status: "accepted" });
  });

  pgTest.for([
    ["pending", "01890a5d-ac96-774b-bcce-b302099a8061", "pending"],
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
        createApp(db, { mail: { sendMail, adminUrl: ADMIN_URL } }).app,
      );
      // Act
      const res = await client.admin.users[":id"].status.$put(
        { param: { id }, json: { status: "accepted" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      await vi.waitFor(() =>
        expect(sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: [`${mailbox}@univ-lorraine.fr`],
            subject: "Your account has been approved",
          }),
        ),
      );
    },
  );

  pgTest.for([
    [
      "a rejected pending user",
      "01890a5d-ac96-774b-bcce-b302099a8061",
      "rejected",
    ],
    [
      "an already accepted user",
      "01890a5d-ac96-774b-bcce-b302099a8062",
      "accepted",
    ],
  ] as const)("should not notify %s", async ([, id, status], { db }) => {
    // Arrange
    await insertResearchers(db);
    await provisionUser(db, "moderator", {
      status: "accepted",
      superAdmin: true,
    });
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const client = testClient(
      createApp(db, { mail: { sendMail, adminUrl: ADMIN_URL } }).app,
    );
    // Act
    const res = await client.admin.users[":id"].status.$put(
      { param: { id }, json: { status } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
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
        createApp(db, { mail: { sendMail, adminUrl: ADMIN_URL } }).app,
      );
      // Act
      const res = await client.admin.users[":id"].status.$put(
        {
          param: { id: "01890a5d-ac96-774b-bcce-b302099a8061" },
          json: { status: "accepted" },
        },
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
      await testClient(createApp(db).app).admin.users[":id"].status.$put(
        {
          param: { id: "01890a5d-ac96-774b-bcce-b302099a8061" },
          json: { status: "accepted" },
        },
        { headers: authHeader },
      );
      // Assert
      expect(info).toHaveBeenCalledWith("user status changed", {
        actor: moderator.id,
        target: "01890a5d-ac96-774b-bcce-b302099a8061",
        status: "accepted",
      });
      info.mockRestore();
    },
  );

  pgTest(
    "should reject an accepted user, keeping their samples",
    async ({ db }) => {
      // Arrange
      await insertResearchers(db);
      const client = await asSuperAdmin(db);
      // Act
      const res = await client.admin.users[":id"].status.$put(
        {
          param: { id: "01890a5d-ac96-774b-bcce-b302099a8062" },
          json: { status: "rejected" },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(userResponseSchema.parse(await res.json()).data).toEqual({
        id: "01890a5d-ac96-774b-bcce-b302099a8062",
        email: "accepted@univ-lorraine.fr",
        name: "Accepted",
        firstname: "Anne",
        orcid: null,
        ...NO_GROUPS,
        status: "rejected",
        superAdmin: false,
      });
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
        "/admin/users/01890a5d-ac96-774b-bcce-b302099a8061/status",
        {
          method: "PUT",
          headers: { "content-type": "application/json", ...authHeader },
          body: JSON.stringify({ status: "pending" }),
        },
      );
      // Assert
      expect(res.status).toBe(400);
      await expect(
        db
          .selectFrom("user")
          .select("status")
          .where("id", "=", "01890a5d-ac96-774b-bcce-b302099a8061")
          .executeTakeFirstOrThrow(),
      ).resolves.toEqual({ status: "pending" });
    },
  );

  pgTest("should answer 404 when setting an unknown user", async ({ db }) => {
    // Arrange
    const client = await asSuperAdmin(db);
    // Act
    const res = await client.admin.users[":id"].status.$put(
      {
        param: { id: "01890a5d-ac96-774b-bcce-b302099a8099" },
        json: { status: "accepted" },
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(404);
  });

  pgTest(
    "should refuse a status change on a revoked session",
    async ({ db }) => {
      // Arrange
      await insertResearchers(db);
      const client = await asSuperAdmin(db);
      vi.mocked(requireActiveSession).mockImplementationOnce(async (c) =>
        c.json({ error: "Unauthorized" }, 401),
      );
      // Act
      const res = await client.admin.users[":id"].status.$put(
        {
          param: { id: "01890a5d-ac96-774b-bcce-b302099a8061" },
          json: { status: "accepted" },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(401);
      await expect(
        db
          .selectFrom("user")
          .select("status")
          .where("id", "=", "01890a5d-ac96-774b-bcce-b302099a8061")
          .executeTakeFirstOrThrow(),
      ).resolves.toEqual({ status: "pending" });
    },
  );

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
        const setStatus = await client.admin.users[":id"].status.$put(
          {
            param: { id: "01890a5d-ac96-774b-bcce-b302099a8061" },
            json: { status: "accepted" },
          },
          { headers: authHeader },
        );
        // Assert
        expect([list.status, setStatus.status]).toEqual([403, 403]);
      },
    );

    pgTest("should answer 401 to an unauthenticated caller", async ({ db }) => {
      // Act
      const res = await createApp(db).app.request("/admin/users");
      // Assert
      expect(res.status).toBe(401);
    });
  });
});
