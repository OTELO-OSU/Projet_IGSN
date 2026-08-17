import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import { createApp } from "../app.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { tokenEmail } from "../tests/provision-user.ts";

const authHeader = { Authorization: "Bearer test-token" };
const callerEmail = tokenEmail("test-token");

const TRIO_A = {
  institutionalOrganization: "04vfs2w97",
  institutionalOsu: "OTELo",
  institutionalLaboratory: "UMR7358",
};

const TRIO_B = {
  institutionalOrganization: "02rx3b187",
  institutionalOsu: "OSUG",
  institutionalLaboratory: "UMR5275",
};

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
      institutionalOrganization: null,
      institutionalOsu: null,
      institutionalLaboratory: null,
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

  pgTest.for([
    {
      case: "a full trio",
      json: {
        institutionalOrganization: "04vfs2w97",
        institutionalOsu: "OTELo",
        institutionalLaboratory: "UMR7358",
      },
      stored: {
        institutionalOrganization: "04vfs2w97",
        institutionalOsu: "OTELo",
        institutionalLaboratory: "UMR7358",
      },
    },
    {
      case: "a laboratory outside any OSU",
      json: {
        institutionalOrganization: "01frn9647",
        institutionalLaboratory: "UMR5150",
      },
      stored: {
        institutionalOrganization: "01frn9647",
        institutionalOsu: null,
        institutionalLaboratory: "UMR5150",
      },
    },
  ])(
    "should set the caller's groups from $case",
    async ({ json, stored }, { db }) => {
      // Arrange
      const client = testClient(createApp(db).app);
      // Act
      const res = await client.admin.currentUser["institutional-groups"].$put(
        { json },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(204);
      const me = await client.admin.currentUser.$get(undefined, {
        headers: authHeader,
      });
      expect(await me.json()).toMatchObject(stored);
    },
  );

  pgTest.for([
    {
      case: "a laboratory outside the submitted OSU",
      json: {
        institutionalOrganization: "014zrew76",
        institutionalOsu: "OBSPM",
        institutionalLaboratory: "UMR7327",
      },
    },
    {
      case: "a laboratory outside the submitted organization",
      json: {
        institutionalOrganization: "05hnb7x64",
        institutionalLaboratory: "UMR7358",
      },
    },
  ])("should answer 400 on $case", async ({ json }, { db }) => {
    // Arrange
    await insertUser(db, callerEmail, { status: "accepted", ...TRIO_A });
    const client = testClient(createApp(db).app);
    // Act
    const res = await client.admin.currentUser["institutional-groups"].$put(
      { json },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Invalid institutional groups",
    });
    const me = await client.admin.currentUser.$get(undefined, {
      headers: authHeader,
    });
    expect(await me.json()).toMatchObject({ ...TRIO_A, status: "accepted" });
  });

  pgTest(
    "should answer 401 to an unauthenticated groups set",
    async ({ db }) => {
      // Act
      const res = await createApp(db).app.request(
        "/admin/currentUser/institutional-groups",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            institutionalOrganization: "04vfs2w97",
            institutionalLaboratory: "UMR7358",
          }),
        },
      );
      // Assert
      expect(res.status).toBe(401);
    },
  );

  pgTest.for([
    {
      case: "send the caller back to pending on a group change",
      user: { status: "accepted" as const, ...TRIO_A },
      json: TRIO_B,
      expected: { ...TRIO_B, status: "pending" },
    },
    {
      case: "keep the status when the submitted trio is unchanged",
      user: { status: "accepted" as const, ...TRIO_A },
      json: TRIO_A,
      expected: { ...TRIO_A, status: "accepted" },
    },
    {
      case: "keep the status on a first declaration",
      user: { status: "accepted" as const },
      json: TRIO_A,
      expected: { ...TRIO_A, status: "accepted" },
    },
    {
      case: "keep a super admin accepted on a group change",
      user: { status: "accepted" as const, superAdmin: true, ...TRIO_A },
      json: TRIO_B,
      expected: { ...TRIO_B, status: "accepted" },
    },
  ])("should $case", async ({ user, json, expected }, { db }) => {
    // Arrange
    await insertUser(db, callerEmail, user);
    const client = testClient(createApp(db).app);
    // Act
    const res = await client.admin.currentUser["institutional-groups"].$put(
      { json },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(204);
    const me = await client.admin.currentUser.$get(undefined, {
      headers: authHeader,
    });
    expect(await me.json()).toMatchObject(expected);
  });

  pgTest(
    "should answer 401 to a groups set when Keycloak reports the session revoked",
    async ({ db }) => {
      // Arrange
      vi.mocked(requireActiveSession).mockImplementationOnce(async (c) =>
        c.json({ error: "Unauthorized" }, 401),
      );
      // Act
      const res = await testClient(createApp(db).app).admin.currentUser[
        "institutional-groups"
      ].$put({ json: TRIO_A }, { headers: authHeader });
      // Assert
      expect(res.status).toBe(401);
    },
  );

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
