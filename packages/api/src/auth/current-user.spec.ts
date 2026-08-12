import { Hono } from "hono";
import { describe, expect } from "vitest";

import type { KeycloakClaims } from "./middleware.ts";

import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { createUserRepository } from "../user/repository.ts";
import { type AuthenticatedEnv, currentUser } from "./current-user.ts";

// The stand-in for requireAuth sets the verified claims exactly as test/setup.ts
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
  identity_provider: "satosa",
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
        firstname: "Jean",
        name: "Martin",
        orcid: null,
        institutionalOrganization: null,
        institutionalOsu: null,
        institutionalLaboratory: null,
        status: "pending",
        superAdmin: false,
      });
    },
  );

  pgTest("should store name parts the token omits as null", async ({ db }) => {
    // Arrange
    const withoutProfile: KeycloakClaims = {
      sub: claims.sub,
      email: claims.email,
      identity_provider: claims.identity_provider,
    };
    // Act
    const res = await appWithClaims(db, withoutProfile).request("/probe");
    // Assert
    expect(await res.json()).toEqual({
      id: expect.any(String),
      email: "jean.martin@univ-lorraine.fr",
      firstname: null,
      name: null,
      orcid: null,
      institutionalOrganization: null,
      institutionalOsu: null,
      institutionalLaboratory: null,
      status: "pending",
      superAdmin: false,
    });
  });

  pgTest("should answer 403 to a rejected caller", async ({ db }) => {
    // Arrange
    await insertUser(db, claims.email!, { status: "rejected" });
    // Act
    const res = await appWithClaims(db, claims).request("/probe");
    // Assert
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  pgTest("should let a pending caller through", async ({ db }) => {
    // Arrange
    await insertUser(db, claims.email!, { status: "pending" });
    // Act
    const res = await appWithClaims(db, claims).request("/probe");
    // Assert
    expect(res.status).toBe(200);
  });

  pgTest(
    "should let a rejected super admin through, since they moderate",
    async ({ db }) => {
      // Arrange
      await insertUser(db, claims.email!, {
        status: "rejected",
        superAdmin: true,
      });
      // Act
      const res = await appWithClaims(db, claims).request("/probe");
      // Assert
      expect(res.status).toBe(200);
    },
  );

  pgTest(
    "should answer 403 and provision nothing on an email claim that is not an address",
    async ({ db }) => {
      // Arrange
      const notAnAddress: KeycloakClaims = {
        sub: claims.sub,
        email: "nope",
        identity_provider: claims.identity_provider,
      };
      // Act
      const res = await appWithClaims(db, notAnAddress).request("/probe");
      // Assert
      expect(res.status).toBe(403);
      await expect(
        db.selectFrom("user").selectAll().execute(),
      ).resolves.toEqual([]);
    },
  );

  // No row is written either, or the next such token would adopt this empty
  // account.
  pgTest(
    "should answer 403 and provision nothing without an email claim",
    async ({ db }) => {
      // Arrange
      const withoutEmail: KeycloakClaims = {
        sub: claims.sub,
        identity_provider: claims.identity_provider,
      };
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

  // preferred_username is the Keycloak shell account's own name, which real
  // ORCID does not fill with the iD: only identity_provider_identity carries it.
  const orcidClaims: KeycloakClaims = {
    sub: "f:orcid:0000-0002-1825-0097",
    preferred_username: "e7c3a1f0-shell",
    identity_provider: "orcid",
    identity_provider_identity: "0000-0002-1825-0097",
  };

  pgTest(
    "should answer 403 to a rejected user signing in via ORCID",
    async ({ db }) => {
      // Arrange
      await insertUser(db, "rejected@univ-lorraine.fr", {
        orcid: "0000-0002-1825-0097",
        status: "rejected",
      });
      // Act
      const res = await appWithClaims(db, orcidClaims).request("/probe");
      // Assert
      expect(res.status).toBe(403);
    },
  );

  pgTest("should resolve an ORCID login to the linked user", async ({ db }) => {
    // Arrange
    const repository = createUserRepository(db);
    const linked = await repository.upsert({
      email: "jean.martin@univ-lorraine.fr",
      name: "Martin",
      firstname: "Jean",
    });
    await repository.setOrcid(linked.id, "0000-0002-1825-0097");
    // Act
    const res = await appWithClaims(db, orcidClaims).request("/probe");
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ...linked,
      orcid: "0000-0002-1825-0097",
    });
  });

  pgTest(
    "should answer 403 and provision nothing for an unlinked ORCID login",
    async ({ db }) => {
      // Act
      const res = await appWithClaims(db, orcidClaims).request("/probe");
      // Assert
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Forbidden" });
      await expect(
        db.selectFrom("user").selectAll().execute(),
      ).resolves.toEqual([]);
    },
  );

  pgTest.for(["orcid", "ORCID"])(
    "should refuse an unlinked %j login even when its token carries an email",
    async (identityProvider, { db }) => {
      // Arrange
      await createUserRepository(db).upsert({
        email: "jean.martin@univ-lorraine.fr",
        name: "Martin",
        firstname: "Jean",
      });
      const withEmail: KeycloakClaims = {
        ...orcidClaims,
        identity_provider: identityProvider,
        email: claims.email,
      };
      // Act
      const res = await appWithClaims(db, withEmail).request("/probe");
      // Assert
      expect(res.status).toBe(403);
    },
  );

  pgTest.for([undefined, "myaccessid"])(
    "should answer 403 and provision nothing for the identity provider %j",
    async (identityProvider, { db }) => {
      // Arrange
      const refused: KeycloakClaims = {
        ...claims,
        identity_provider: identityProvider,
      };
      // Act
      const res = await appWithClaims(db, refused).request("/probe");
      // Assert
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "Forbidden",
        reason: "unsupported_identity_provider",
      });
      await expect(
        db.selectFrom("user").selectAll().execute(),
      ).resolves.toEqual([]);
    },
  );

  pgTest(
    "should refuse a provider the operator left out of the allow-list",
    async ({ db }) => {
      // Arrange
      process.env.OIDC_ALLOWED_IDENTITY_PROVIDERS = "satosa";
      // Act
      const res = await appWithClaims(db, orcidClaims).request("/probe");
      // Assert
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "Forbidden",
        reason: "unsupported_identity_provider",
      });
    },
  );

  pgTest.for(["", "   "])(
    "should fall back to the default allow-list when the configured one is %j",
    async (configured, { db }) => {
      // Arrange
      process.env.OIDC_ALLOWED_IDENTITY_PROVIDERS = configured;
      // Act
      const brokered = await appWithClaims(db, claims).request("/probe");
      const orcid = await appWithClaims(db, orcidClaims).request("/probe");
      // Assert
      expect(brokered.status).toBe(200);
      // No reason, so this ORCID login passed the allow-list and failed on the
      // missing local link instead.
      expect(await orcid.json()).toEqual({ error: "Forbidden" });
    },
  );

  pgTest(
    "should refuse an ORCID login without an identity_provider_identity claim",
    async ({ db }) => {
      // Arrange
      const withoutIdentity: KeycloakClaims = {
        sub: orcidClaims.sub,
        preferred_username: orcidClaims.preferred_username,
        identity_provider: "orcid",
      };
      // Act
      const res = await appWithClaims(db, withoutIdentity).request("/probe");
      // Assert
      expect(res.status).toBe(403);
    },
  );
});
