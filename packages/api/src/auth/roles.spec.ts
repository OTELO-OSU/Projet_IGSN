import { Hono } from "hono";
import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";

import type { KeycloakClaims } from "./middleware.ts";

import { requireRole } from "./roles.ts";

// The guard runs after requireAuth; simulate the verified claims it leaves.
const appWithClaims = (claims?: KeycloakClaims) =>
  new Hono<{ Variables: { jwtPayload: KeycloakClaims } }>()
    .use(async (c, next) => {
      if (claims) c.set("jwtPayload", claims);
      await next();
    })
    .get("/admin", requireRole("admin"), (c) => c.json({ ok: true }));

const user = (roles?: string[]): KeycloakClaims => ({
  sub: "user-1",
  ...(roles ? { realm_access: { roles } } : {}),
});

describe("requireRole", () => {
  it("should let a token carrying the role through", async () => {
    const res = await testClient(appWithClaims(user(["admin"]))).admin.$get();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("should return 403 when the role is missing", async () => {
    const res = await testClient(appWithClaims(user(["editor"]))).admin.$get();

    expect(res.status).toBe(403);
  });

  it("should return 403 when the token carries no roles at all", async () => {
    const res = await testClient(appWithClaims(user())).admin.$get();

    expect(res.status).toBe(403);
  });

  it("should return 403 when no verified claims are present", async () => {
    const res = await testClient(appWithClaims()).admin.$get();

    expect(res.status).toBe(403);
  });
});
