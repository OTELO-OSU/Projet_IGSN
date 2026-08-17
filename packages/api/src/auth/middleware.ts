import { every } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { jwk } from "hono/jwk";

const issuer = process.env.OIDC_ISSUER ?? "http://localhost:8080/realms/igsn";
const jwksUri =
  process.env.OIDC_JWKS_URI ?? `${issuer}/protocol/openid-connect/certs`;
const audience = process.env.OIDC_AUDIENCE;
const clientId = process.env.OIDC_CLIENT_ID ?? "igsn-admin";

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
        typeof claims.exp !== "number"
      ) {
        throw new HTTPException(401, { message: "Unauthorized" });
      }
      await next();
    },
  ),
);

export type KeycloakClaims = {
  sub: string;
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
