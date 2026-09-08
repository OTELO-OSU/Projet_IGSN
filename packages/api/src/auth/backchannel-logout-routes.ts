import type { JWTPayload } from "hono/utils/jwt/types";

import { Hono } from "hono";
import { verifyWithJwks } from "hono/jwt";
import { validator } from "hono/validator";
import { z } from "zod";

import type { SessionClaims } from "./revoked-sessions.ts";

import { revokeSession } from "./revoked-sessions.ts";

const BACKCHANNEL_LOGOUT_EVENT =
  "http://schemas.openid.net/event/backchannel-logout";

const issuer = process.env.OIDC_ISSUER ?? "http://localhost:8080/realms/igsn";
const jwksUri =
  process.env.OIDC_JWKS_URI ?? `${issuer}/protocol/openid-connect/certs`;
const clientId = process.env.OIDC_CLIENT_ID ?? "igsn-admin";

const logoutFormSchema = z.object({ logout_token: z.string().min(1) });

const validateLogoutForm = validator("form", (value, c) => {
  const parsed = logoutFormSchema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: "invalid_request" }, 400);
  }
  return parsed.data;
});

const sessionClaims = (claims: JWTPayload): SessionClaims => ({
  sid: typeof claims.sid === "string" ? claims.sid : undefined,
  sub: typeof claims.sub === "string" ? claims.sub : undefined,
});

const hasLogoutEvent = (events: unknown): boolean =>
  typeof events === "object" &&
  events !== null &&
  BACKCHANNEL_LOGOUT_EVENT in events;

function invalidClaimReason(
  claims: JWTPayload,
  session: SessionClaims,
): string | undefined {
  if (typeof claims.iat !== "number") return "iat is not a number";
  if ("nonce" in claims) return "nonce claim present";
  if (!hasLogoutEvent(claims.events)) return "backchannel logout event missing";
  if (!session.sid && !session.sub) return "neither sid nor sub";
  return undefined;
}

const refuse = (reason: string) => {
  console.warn("back-channel logout refused", { reason });
};

export const backchannelLogoutRoutes = new Hono().post(
  "/",
  validateLogoutForm,
  async (c) => {
    let claims: JWTPayload;
    try {
      claims = await verifyWithJwks(c.req.valid("form").logout_token, {
        jwks_uri: jwksUri,
        allowedAlgorithms: ["RS256"],
        verification: { iss: issuer, aud: clientId },
      });
    } catch (error) {
      refuse(error instanceof Error ? error.name : "unverifiable logout token");
      return c.json({ error: "invalid_request" }, 400);
    }

    const session = sessionClaims(claims);
    const reason = invalidClaimReason(claims, session);
    if (reason) {
      refuse(reason);
      return c.json({ error: "invalid_request" }, 400);
    }

    revokeSession(session);
    return c.body(null, 204);
  },
);
