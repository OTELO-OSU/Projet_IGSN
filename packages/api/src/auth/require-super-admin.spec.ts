import type { User } from "@projet-igsn/domain/user/model";

import { Hono } from "hono";
import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";

import { type AuthenticatedEnv } from "./current-user.ts";
import { requireSuperAdmin } from "./require-super-admin.ts";

// The guard runs after currentUser; simulate the caller it resolves.
const appWithUser = (user?: User) =>
  new Hono<AuthenticatedEnv>()
    .use(async (c, next) => {
      if (user) c.set("user", user);
      await next();
    })
    .get("/users", requireSuperAdmin, (c) => c.json({ ok: true }));

const user = (overrides: Partial<User>): User => ({
  id: "01890a5d-ac96-774b-bcce-b302099a8057",
  email: "moderator@univ-lorraine.fr",
  name: null,
  firstname: null,
  orcid: null,
  status: "accepted",
  superAdmin: false,
  ...overrides,
});

describe("requireSuperAdmin", () => {
  it("should let a super admin through", async () => {
    const res = await testClient(
      appWithUser(user({ superAdmin: true })),
    ).users.$get();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("should return 403 for an accepted user who is not super admin", async () => {
    const res = await testClient(appWithUser(user({}))).users.$get();

    expect(res.status).toBe(403);
  });

  it("should return 403 for a pending user", async () => {
    const res = await testClient(
      appWithUser(user({ status: "pending" })),
    ).users.$get();

    expect(res.status).toBe(403);
  });

  it("should return 403 when no caller was resolved", async () => {
    const res = await testClient(appWithUser()).users.$get();

    expect(res.status).toBe(403);
  });
});
