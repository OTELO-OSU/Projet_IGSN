import { listUsersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { testClient } from "hono/testing";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";
import { createUserRepository } from "./repository.ts";

const authHeader = { Authorization: "Bearer test-token" };

async function insertResearcher(
  db: Parameters<typeof createApp>[0],
  name: string,
  email: string,
) {
  await createUserRepository(db).upsert({ email, name, firstname: null });
}

describe("admin user routes", () => {
  pgTest("should search researchers by name", async ({ db }) => {
    await insertResearcher(db, "Curie", "marie.curie@univ-lorraine.fr");
    await insertResearcher(db, "Dupont", "pierre.dupont@univ-lorraine.fr");

    const res = await testClient(createApp(db)).admin.users.$get(
      { query: { search: "curie" } },
      { headers: authHeader },
    );

    expect(res.status).toBe(200);
    const body = listUsersResponseSchema.parse(await res.json());
    expect(body.data.map((user) => user.name)).toEqual(["Curie"]);
  });

  pgTest("should search researchers by email", async ({ db }) => {
    await insertResearcher(db, "Curie", "marie.curie@univ-lorraine.fr");

    const res = await testClient(createApp(db)).admin.users.$get(
      { query: { search: "marie.curie@" } },
      { headers: authHeader },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      data: [{ email: "marie.curie@univ-lorraine.fr" }],
    });
  });

  pgTest(
    "should answer 200 with no result for an unknown term",
    async ({ db }) => {
      await insertResearcher(db, "Curie", "marie.curie@univ-lorraine.fr");

      const res = await testClient(createApp(db)).admin.users.$get(
        { query: { search: "zzz" } },
        { headers: authHeader },
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [] });
    },
  );

  pgTest("should return at most ten researchers", async ({ db }) => {
    for (let index = 0; index < 12; index += 1) {
      await insertResearcher(
        db,
        `Geologue${index}`,
        `geologue${index}@univ-lorraine.fr`,
      );
    }

    const res = await testClient(createApp(db)).admin.users.$get(
      { query: { search: "geologue" } },
      { headers: authHeader },
    );

    const body = listUsersResponseSchema.parse(await res.json());
    expect(body.data).toHaveLength(10);
  });

  pgTest.for(["", "c"])(
    "should reject the search term %s with 400",
    async (search, { db }) => {
      const res = await createApp(db).request(`/admin/users?search=${search}`, {
        headers: authHeader,
      });

      expect(res.status).toBe(400);
    },
  );

  pgTest("should reject a missing search term with 400", async ({ db }) => {
    const res = await createApp(db).request("/admin/users", {
      headers: authHeader,
    });

    expect(res.status).toBe(400);
  });

  pgTest("should reject an unauthenticated search with 401", async ({ db }) => {
    const res = await createApp(db).request("/admin/users?search=curie");

    expect(res.status).toBe(401);
  });
});
