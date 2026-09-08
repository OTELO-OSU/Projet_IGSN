import { every } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { jwk } from "hono/jwk";

import { clientId, issuer, jwksUri } from "./oidc-config.ts";
import { isSessionRevoked } from "./revoked-sessions.ts";

const audience = process.env.OIDC_AUDIENCE;

export const requireAuth = every(
  jwk({
    jwks_uri: jwksUri,
    alg: ["RS256"],
    verification: { iss: issuer, aud: audience },
  }),
  createMiddleware<{ Variables: { jwtPayload: KeycloakClaims } }>(
    async (c, next) => {
      const claims = c.get("jwtPayload");
      if (
        claims.azp !== clientId ||
        claims.typ !== "Bearer" ||
        typeof claims.exp !== "number" ||
        isSessionRevoked(claims)
      ) {
        throw new HTTPException(401, { message: "Unauthorized" });
      }
      await next();
    },
  ),
);

export type KeycloakClaims = {
  sub: string;
  sid?: string;
  azp?: string;
  typ?: string;
  exp?: number;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  identity_provider?: string;
  identity_provider_identity?: string;
  realm_access?: { roles?: string[] };
};
