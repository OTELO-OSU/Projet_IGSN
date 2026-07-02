import { jwk } from "hono/jwk";

// Verify the Keycloak access token against the realm JWKS: signature, issuer, and
// expiry (hono/jwk checks exp by default). In Docker the browser-facing issuer and
// the URL the api reaches Keycloak on differ, so OIDC_JWKS_URI is separate from
// OIDC_ISSUER; both default to the local dev Keycloak for non-Docker runs.
const issuer = process.env.OIDC_ISSUER ?? "http://localhost:8080/realms/igsn";
const jwksUri =
  process.env.OIDC_JWKS_URI ?? `${issuer}/protocol/openid-connect/certs`;

// Populates c.get("jwtPayload") with the verified claims; 401s otherwise.
// alg is pinned to RS256 (Keycloak's default) to rule out algorithm confusion.
export const requireAuth = jwk({
  jwks_uri: jwksUri,
  alg: ["RS256"],
  verification: { iss: issuer },
});

// The Keycloak claims the api actually reads off a verified token.
export type KeycloakClaims = {
  sub: string;
  preferred_username?: string;
  name?: string;
  email?: string;
};
