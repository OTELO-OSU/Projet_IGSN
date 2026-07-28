import { Hono } from "hono";
import { describe, expect } from "vitest";

import type { KeycloakClaims } from "./middleware.ts";

import { pgTest } from "../tests/pg-test.ts";
import { createUserRepository } from "../user/repository.ts";
import { type AuthenticatedEnv, currentUser } from "./current-user.ts";

// Drives the middleware through a real Hono app and the real repository. The
// stand-in for requireAuth sets the verified claims exactly as test/setup.ts
// does, but per test: mounting createApp instead would inherit that suite-wide
// stub, whose claims always carry an email.
function appWithClaims(
  db: Parameters<typeof createUserRepository>[0],
  claims: KeycloakClaims,
) {
  return new Hono<AuthenticatedEnv>()
    .use("*", async (c, next) => {
      c.set("jwtPayload", claims);
      await next();
    })
    .use("*", currentUser(createUserRepository(db)))
    .get("/probe", (c) => c.json(c.get("user")));
}

const claims: KeycloakClaims = {
  sub: "f:saml-idp:jean.martin",
  email: "jean.martin@univ-lorraine.fr",
  given_name: "Jean",
  family_name: "Martin",
};

describe("currentUser", () => {
  pgTest(
    "should provision the caller and hand them to the route",
    async ({ db }) => {
      // Act
      const res = await appWithClaims(db, claims).request("/probe");
      // Assert
      expect(await res.json()).toEqual({
        id: expect.any(String),
        email: "jean.martin@univ-lorraine.fr",
        // The IdP's given_name/family_name land as firstname/name.
        firstname: "Jean",
        name: "Martin",
      });
    },
  );

  pgTest("should store name parts the token omits as null", async ({ db }) => {
    // Arrange
    const withoutProfile: KeycloakClaims = {
      sub: claims.sub,
      email: claims.email,
    };
    // Act
    const res = await appWithClaims(db, withoutProfile).request("/probe");
    // Assert
    expect(await res.json()).toEqual({
      id: expect.any(String),
      email: "jean.martin@univ-lorraine.fr",
      firstname: null,
      name: null,
    });
  });

  // Email is the identity key, so a token without one cannot own anything: it is
  // refused rather than given an account keyed on nothing (ADR 0019). No row is
  // written either, or the next such token would adopt this empty account.
  pgTest(
    "should answer 403 and provision nothing without an email claim",
    async ({ db }) => {
      // Arrange
      const withoutEmail: KeycloakClaims = { sub: claims.sub };
      // Act
      const res = await appWithClaims(db, withoutEmail).request("/probe");
      // Assert
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Forbidden" });
      await expect(
        db.selectFrom("user").selectAll().execute(),
      ).resolves.toEqual([]);
    },
  );
});
