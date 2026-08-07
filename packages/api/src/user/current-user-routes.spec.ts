import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import { createApp } from "../app.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";

const authHeader = { Authorization: "Bearer test-token" };

describe("currentUser routes", () => {
  pgTest("should return the caller's claims and orcid", async ({ db }) => {
    // Act
    const res = await testClient(createApp(db).app).admin.currentUser.$get(
      undefined,
      {
        headers: authHeader,
      },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      sub: "test-token",
      status: "pending",
      superAdmin: false,
      email: "test-token@example.com",
      orcid: null,
    });
  });

  pgTest("should set the caller's orcid", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db).app);
    // Act
    const res = await client.admin.currentUser.orcid.$put(
      { json: { orcid: "0000-0002-1825-0097" } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orcid: "0000-0002-1825-0097" });
    const me = await client.admin.currentUser.$get(undefined, {
      headers: authHeader,
    });
    expect(await me.json()).toMatchObject({ orcid: "0000-0002-1825-0097" });
  });

  pgTest("should clear the caller's orcid with null", async ({ db }) => {
    // Arrange
    const client = testClient(createApp(db).app);
    await client.admin.currentUser.orcid.$put(
      { json: { orcid: "0000-0002-1825-0097" } },
      { headers: authHeader },
    );
    // Act
    const res = await client.admin.currentUser.orcid.$put(
      { json: { orcid: null } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orcid: null });
  });

  pgTest(
    "should answer 409 when another user holds the orcid",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "holder@univ-lorraine.fr", {
        orcid: "0000-0002-1825-0097",
      });
      // Act
      const res = await testClient(
        createApp(db).app,
      ).admin.currentUser.orcid.$put(
        { json: { orcid: "0000-0002-1825-0097" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({
        error: "ORCID already linked to another account",
      });
    },
  );

  // Invalid payloads go through the raw request: the typed RPC client would
  // reject them at compile time.
  pgTest.for([
    { case: "a malformed orcid", body: { orcid: "not-an-orcid" } },
    { case: "a missing orcid field", body: {} },
    {
      case: "an unknown extra field",
      body: { orcid: "0000-0002-1825-0097", admin: true },
    },
  ])("should answer 400 on $case", async ({ body }, { db }) => {
    // Act
    const res = await createApp(db).app.request("/admin/currentUser/orcid", {
      method: "PUT",
      headers: { "content-type": "application/json", ...authHeader },
      body: JSON.stringify(body),
    });
    // Assert
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid ORCID" });
  });

  pgTest(
    "should answer 401 when Keycloak reports the session revoked",
    async ({ db }) => {
      // Arrange
      vi.mocked(requireActiveSession).mockImplementationOnce(async (c) =>
        c.json({ error: "Unauthorized" }, 401),
      );
      // Act
      const res = await testClient(
        createApp(db).app,
      ).admin.currentUser.orcid.$put(
        { json: { orcid: "0000-0002-1825-0097" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(401);
    },
  );
});
