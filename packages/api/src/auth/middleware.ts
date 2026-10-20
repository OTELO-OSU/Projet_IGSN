import type { Context } from "hono";
import type { webcrypto } from "node:crypto";

import { every } from "hono/combine";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { jwk } from "hono/jwk";
import { Jwt } from "hono/utils/jwt";

const issuer = process.env.OIDC_ISSUER ?? "http://localhost:8080/realms/igsn";
const jwksUri =
  process.env.OIDC_JWKS_URI ?? `${issuer}/protocol/openid-connect/certs`;
const audience = process.env.OIDC_AUDIENCE;
const clientId = process.env.OIDC_CLIENT_ID ?? "igsn-admin";

const JWKS_TTL_MS = 10 * 60_000;
const JWKS_UNKNOWN_KID_REFETCH_MS = 60_000;

type Jwk = webcrypto.JsonWebKey & { kid?: string };

let cachedKeys: Jwk[] | undefined;
let fetchedAt = -Infinity;

async function fetchJwks(): Promise<Jwk[]> {
  const res = await fetch(jwksUri, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`JWKS request answered ${res.status}`);
  const { keys } = (await res.json()) as { keys?: unknown };
  if (!Array.isArray(keys)) throw new Error("JWKS response carries no keys");
  return keys as Jwk[];
}

async function jwksKeys(c: Context): Promise<Jwk[]> {
  const token = c.req.header("Authorization")?.split(/\s+/)[1] ?? "";
  const { kid } = Jwt.decode(token).header;
  const age = Date.now() - fetchedAt;
  if (
    !cachedKeys ||
    age >= JWKS_TTL_MS ||
    (age >= JWKS_UNKNOWN_KID_REFETCH_MS &&
      !cachedKeys.some((key) => key.kid === kid))
  ) {
    fetchedAt = Date.now();
    try {
      cachedKeys = await fetchJwks();
    } catch (error) {
      console.error("JWKS request failed", { jwksUri, error });
      if (!cachedKeys)
        throw new HTTPException(401, { message: "Unauthorized" });
    }
  }
  return cachedKeys;
}

export const requireAuth = every(
  jwk({
    keys: jwksKeys,
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
