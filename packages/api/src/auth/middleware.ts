import { every } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { jwk } from "hono/jwk";

// Verify the Keycloak access token against the realm JWKS: signature, issuer, and
// expiry (hono/jwk checks exp by default). In Docker the browser-facing issuer and
// the URL the api reaches Keycloak on differ, so OIDC_JWKS_URI is separate from
// OIDC_ISSUER; both default to the local dev Keycloak for non-Docker runs.
const issuer = process.env.OIDC_ISSUER ?? "http://localhost:8080/realms/igsn";
const jwksUri =
  process.env.OIDC_JWKS_URI ?? `${issuer}/protocol/openid-connect/certs`;
// GaiaData exposes no audience scope yet, so the ADR 0006 aud check is opt-in
// via OIDC_AUDIENCE (hono skips it when undefined); azp + typ below stand in.
const audience = process.env.OIDC_AUDIENCE;
const clientId = process.env.OIDC_CLIENT_ID ?? "igsn-admin";

// Populates c.get("jwtPayload") with the verified claims; 401s otherwise.
// alg is pinned to RS256 (Keycloak's default) to rule out algorithm confusion.
export const requireAuth = every(
  jwk({
    jwks_uri: jwksUri,
    alg: ["RS256"],
    verification: { iss: issuer, aud: audience },
  }),
  // Shared realm: a valid signature says nothing about who the token was minted
  // for. azp is the issuing client, typ an access token vs an id_token replayed.
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

// The Keycloak claims the api actually reads off a verified token.
// given_name/family_name come from the default `profile` scope, filled by the
// IdP attribute mappers (see keycloak/realm-igsn.json); currentUser stores them
// as the local user's firstname/name.
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
  realm_access?: { roles?: string[] };
};
