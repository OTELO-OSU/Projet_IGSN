import { Hono } from "hono";
import { decodeBase64Url } from "hono/utils/encode";
import { verifying } from "hono/utils/jwt/jws";
import { validator } from "hono/validator";
import { z } from "zod";

import type { SessionClaims } from "./revoked-sessions.ts";

import { clientId, issuer, jwksUri } from "./oidc-config.ts";
import { revokeSession } from "./revoked-sessions.ts";

const BACKCHANNEL_LOGOUT_EVENT =
  "http://schemas.openid.net/event/backchannel-logout";
const ACCEPTED_TYP = /^(jwt|logout\+jwt)$/i;

type LogoutClaims = Record<string, unknown>;

const logoutFormSchema = z.object({ logout_token: z.string().min(1) });
const headerSchema = z.object({
  alg: z.string(),
  kid: z.string(),
  typ: z.string().optional(),
});
const jwksSchema = z.object({
  keys: z.array(z.record(z.string(), z.unknown())),
});
const rsaJwkSchema = z.object({
  kid: z.string(),
  kty: z.literal("RSA"),
  n: z.string(),
  e: z.string(),
});
const claimsSchema = z.record(z.string(), z.unknown());

const validateLogoutForm = validator("form", (value, c) => {
  const parsed = logoutFormSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "invalid_request" }, 400);
  }
  return parsed.data;
});

const brief = (value: unknown): string => String(value).slice(0, 80);

const decodeJsonPart = (part: string): unknown => {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(part)));
  } catch {
    throw new Error("logout token part is not json");
  }
};

const sessionClaims = (claims: LogoutClaims): SessionClaims => ({
  sid: typeof claims.sid === "string" ? claims.sid : undefined,
  sub: typeof claims.sub === "string" ? claims.sub : undefined,
});

const hasAudience = (aud: unknown): boolean =>
  aud === clientId || (Array.isArray(aud) && aud.includes(clientId));

const hasLogoutEvent = (events: unknown): boolean =>
  typeof events === "object" &&
  events !== null &&
  BACKCHANNEL_LOGOUT_EVENT in events;

function invalidClaimReason(claims: LogoutClaims): string | undefined {
  if (claims.iss !== issuer) return "another issuer";
  if (!hasAudience(claims.aud)) return "another audience";
  if (typeof claims.iat !== "number") return "iat is not a number";
  if (claims.exp !== undefined) {
    if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
      return "expired";
    }
  }
  if ("nonce" in claims) return "nonce claim present";
  if (!hasLogoutEvent(claims.events)) return "backchannel logout event missing";
  const session = sessionClaims(claims);
  if (!session.sid && !session.sub) return "neither sid nor sub";
  return undefined;
}

async function signingJwk(kid: string) {
  const response = await fetch(jwksUri);
  if (!response.ok) throw new Error("jwks fetch failed");
  const jwks = jwksSchema.safeParse(await response.json());
  if (!jwks.success) throw new Error("jwks response is not a key set");
  const jwk = rsaJwkSchema.safeParse(
    jwks.data.keys.find((candidate) => candidate.kid === kid),
  );
  if (!jwk.success) throw new Error("no rsa jwks key for the logout token kid");
  return jwk.data;
}

async function verifiedLogoutClaims(
  logoutToken: string,
): Promise<LogoutClaims> {
  const [headerPart, payloadPart, signaturePart, ...extra] =
    logoutToken.split(".");
  if (!headerPart || !payloadPart || !signaturePart || extra.length > 0) {
    throw new Error("malformed logout token");
  }

  const rawHeader = decodeJsonPart(headerPart);
  const header = headerSchema.safeParse(rawHeader);
  if (
    !header.success ||
    header.data.alg !== "RS256" ||
    !ACCEPTED_TYP.test(header.data.typ ?? "JWT")
  ) {
    throw new Error(`unsupported header ${brief(JSON.stringify(rawHeader))}`);
  }

  const verified = await verifying(
    await signingJwk(header.data.kid),
    "RS256",
    decodeBase64Url(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`),
  );
  if (!verified) throw new Error("signature mismatch");

  const claims = claimsSchema.safeParse(decodeJsonPart(payloadPart));
  if (!claims.success) throw new Error("payload is not a json object");
  const reason = invalidClaimReason(claims.data);
  if (reason) throw new Error(reason);

  return claims.data;
}

export const backchannelLogoutRoutes = new Hono().post(
  "/",
  validateLogoutForm,
  async (c) => {
    let claims: LogoutClaims;
    try {
      claims = await verifiedLogoutClaims(c.req.valid("form").logout_token);
    } catch (error) {
      console.warn("back-channel logout refused", {
        reason: error instanceof Error ? error.message : "unverifiable token",
      });
      return c.json({ error: "invalid_request" }, 400);
    }

    revokeSession(sessionClaims(claims));
    return c.body(null, 204);
  },
);
