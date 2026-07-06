import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

// Live revalidation for critical actions (GaiaData REQ-CRIT-01): a locally
// valid JWT can outlive a revoked session by up to its 5 min lifespan, so ask
// Keycloak. /userinfo answers for the presented token without needing a
// confidential client, unlike /introspect. Attach after requireAuth on
// destructive/rights-granting routes; see .claude/rules/security-backend.md.
const issuer = process.env.OIDC_ISSUER ?? "http://localhost:8080/realms/igsn";
const userinfoUri =
  process.env.OIDC_USERINFO_URI ?? `${issuer}/protocol/openid-connect/userinfo`;

export const requireActiveSession = createMiddleware(async (c, next) => {
  const authorization = c.req.header("Authorization");
  if (!authorization) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  try {
    const res = await fetch(userinfoUri, {
      headers: { Authorization: authorization },
    });

    if (!res.ok) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
  } catch {
    // Treat an unreachable userinfo endpoint as an unconfirmed session (401), not
    // a server error: fail closed on the same contract callers expect from a
    // revoked session, rather than surfacing a 500 on a transient network blip.
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  await next();
});
