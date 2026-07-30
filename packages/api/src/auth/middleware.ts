import { jwk } from "hono/jwk";

// Verify the Keycloak access token against the realm JWKS: signature, issuer, and
// expiry (hono/jwk checks exp by default). In Docker the browser-facing issuer and
// the URL the api reaches Keycloak on differ, so OIDC_JWKS_URI is separate from
// OIDC_ISSUER; both default to the local dev Keycloak for non-Docker runs.
const issuer = process.env.OIDC_ISSUER ?? "http://localhost:8080/realms/igsn";
const jwksUri =
  process.env.OIDC_JWKS_URI ?? `${issuer}/protocol/openid-connect/certs`;
// GaiaData provisions no dedicated audience yet, so the ADR 0006 mandatory aud
// check (REQ-TOKEN-03/04) is opt-in via OIDC_AUDIENCE until they add an
// audience scope; hono skips the check when aud is undefined.
const audience = process.env.OIDC_AUDIENCE;

// Populates c.get("jwtPayload") with the verified claims; 401s otherwise.
// alg is pinned to RS256 (Keycloak's default) to rule out algorithm confusion.
export const requireAuth = jwk({
  jwks_uri: jwksUri,
  alg: ["RS256"],
  verification: { iss: issuer, aud: audience },
});

// The Keycloak claims the api actually reads off a verified token.
// given_name/family_name come from the default `profile` scope, filled by the
// IdP attribute mappers (see keycloak/realm-igsn.json); currentUser stores them
// as the local user's firstname/name.
export type KeycloakClaims = {
  sub: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  realm_access?: { roles?: string[] };
};
