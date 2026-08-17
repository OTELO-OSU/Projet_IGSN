import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { MiddlewareHandler } from "hono";

import { UNSUPPORTED_IDENTITY_PROVIDER } from "@projet-igsn/domain/user/unsupported-identity-provider";
import { z } from "zod";

import type { KeycloakClaims } from "./middleware.ts";

const tokenEmailSchema = z.email();

export type AuthenticatedEnv = {
  Variables: { jwtPayload: KeycloakClaims; user: User };
};

const DEFAULT_ALLOWED_IDENTITY_PROVIDERS = ["satosa", "orcid"];

function allowedIdentityProviders(): string[] {
  const configured = (process.env.OIDC_ALLOWED_IDENTITY_PROVIDERS ?? "")
    .split(",")
    .map((alias) => alias.trim().toLowerCase())
    .filter((alias) => alias !== "");
  return configured.length > 0
    ? configured
    : DEFAULT_ALLOWED_IDENTITY_PROVIDERS;
}

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
    if (user.status === "rejected" && !user.superAdmin) {
      return c.json({ error: "Forbidden" }, 403);
    }
    c.set("user", user);
    await next();
  };
}
