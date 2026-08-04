import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { MiddlewareHandler } from "hono";

import type { KeycloakClaims } from "./middleware.ts";

export type AuthenticatedEnv = {
  Variables: { jwtPayload: KeycloakClaims; user: User };
};

// Resolves the caller to their local user row, creating it on first sight: there
// is no user-management UI, so the token is the only source of accounts (ADR
// 0019). Runs right after requireAuth, so the claims are already verified.
// Email is the identity key; a token without one cannot own anything.
export function currentUser(
  users: UserRepository,
): MiddlewareHandler<AuthenticatedEnv> {
  return async (c, next) => {
    const claims = c.get("jwtPayload");
    // ORCID logins resolve strictly by the stored orcid (Keycloak brokers the
    // account with username = ORCID iD) and never reach the email upsert: a
    // broker-supplied email is user-controlled, so upserting by it would hand
    // over the matching account (ADR 0020). Unlinked ORCIDs get no account.
    if (claims.identity_provider === "orcid") {
      const user = claims.preferred_username
        ? await users.findByOrcid(claims.preferred_username)
        : undefined;
      if (!user) {
        return c.json({ error: "Forbidden" }, 403);
      }
      c.set("user", user);
      return next();
    }
    if (!claims.email) {
      return c.json({ error: "Forbidden" }, 403);
    }
    c.set(
      "user",
      await users.upsert({
        email: claims.email,
        name: claims.family_name ?? null,
        firstname: claims.given_name ?? null,
      }),
    );
    await next();
  };
}
