import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { MiddlewareHandler } from "hono";

import { UNSUPPORTED_IDENTITY_PROVIDER } from "@projet-igsn/domain/user/unsupported-identity-provider";
import { z } from "zod";

import type { KeycloakClaims } from "./middleware.ts";

// Stricter than the row schema on purpose: legacy-imported rows may keep odd
// addresses, but a live token must present a real one.
const tokenEmailSchema = z.email();

export type AuthenticatedEnv = {
  Variables: { jwtPayload: KeycloakClaims; user: User };
};

// eduGAIN (brokered as satosa) and ORCID, the two providers the registry
// accepts: the SSO also brokers MyAccessID and offers self-registration, and
// neither may authenticate.
const DEFAULT_ALLOWED_IDENTITY_PROVIDERS = ["satosa", "orcid"];

// An empty or whitespace-only value falls back to the default, so a compose
// entry set to "" cannot lock every user out of the registry.
function allowedIdentityProviders(): string[] {
  const configured = (process.env.OIDC_ALLOWED_IDENTITY_PROVIDERS ?? "")
    .split(",")
    .map((alias) => alias.trim().toLowerCase())
    .filter((alias) => alias !== "");
  return configured.length > 0
    ? configured
    : DEFAULT_ALLOWED_IDENTITY_PROVIDERS;
}

// Resolves the caller to their local user row, creating it on first sight: there
// is no user-management UI, so the token is the only source of accounts (ADR
// 0019). ORCID logins resolve strictly by the stored orcid (Keycloak brokers the
// account with username = ORCID iD) and never reach the email upsert: a
// broker-supplied email is user-controlled, so upserting by it would hand
// over the matching account (ADR 0020).
async function resolveUser(
  users: UserRepository,
  claims: KeycloakClaims,
): Promise<User | undefined> {
  if (claims.identity_provider?.toLowerCase() === "orcid") {
    return claims.identity_provider_identity
      ? users.findByOrcid(claims.identity_provider_identity)
      : undefined;
  }
  const email = tokenEmailSchema.safeParse(claims.email);
  if (!email.success) {
    return undefined;
  }
  return users.upsert({
    email: email.data,
    name: claims.family_name ?? null,
    firstname: claims.given_name ?? null,
  });
}

export function currentUser(
  users: UserRepository,
): MiddlewareHandler<AuthenticatedEnv> {
  return async (c, next) => {
    const claims = c.get("jwtPayload");
    const identityProvider = claims.identity_provider?.toLowerCase();
    if (
      !identityProvider ||
      !allowedIdentityProviders().includes(identityProvider)
    ) {
      // A claim mapper missing at the SSO otherwise reads as a wave of local
      // self-registrations.
      console.info("identity provider refused", {
        sub: claims.sub,
        azp: claims.azp,
        identityProvider: claims.identity_provider,
      });
      return c.json(
        { error: "Forbidden", reason: UNSUPPORTED_IDENTITY_PROVIDER },
        403,
      );
    }
    const user = await resolveUser(users, claims);
    if (!user) {
      return c.json({ error: "Forbidden" }, 403);
    }
    // 403 rather than 401, or the SPA would retry it as an expired session.
    // A super admin moderates, so their status never locks them.
    if (user.status === "rejected" && !user.superAdmin) {
      return c.json({ error: "Forbidden" }, 403);
    }
    c.set("user", user);
    await next();
  };
}
