import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { validateSetOrcidBody } from "./validator.ts";

// Mounted under /admin, so requireAuth and currentUser already ran.
export function createMeRoutes(users: UserRepository) {
  return (
    new Hono<AuthenticatedEnv>()
      .get("/", (c) => {
        const claims = c.get("jwtPayload");
        return c.json({
          sub: claims.sub,
          username: claims.preferred_username,
          name: claims.name,
          email: claims.email,
          orcid: c.get("user").orcid,
        });
      })
      // The stored orcid becomes a sign-in credential (ADR 0020), so setting it
      // is rights-granting: revalidate the session live (GaiaData REQ-CRIT-01).
      .put("/orcid", requireActiveSession, validateSetOrcidBody, async (c) => {
        const updated = await users.setOrcid(
          c.get("user").id,
          c.req.valid("json").orcid,
        );
        if (!updated) {
          return c.json(
            { error: "ORCID already linked to another account" },
            409,
          );
        }
        return c.json({ orcid: updated.orcid });
      })
  );
}
