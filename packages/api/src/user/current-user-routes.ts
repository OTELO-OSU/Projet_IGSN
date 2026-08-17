import type { MyManualGroupsResponse } from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { CurrentUser } from "@projet-igsn/domain/user/current-user";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { validateManualGroupIdParam } from "../manual-group/validator.ts";
import {
  validateSetInstitutionalGroupsBody,
  validateSetOrcidBody,
} from "./validator.ts";

// Mounted under /admin, so requireAuth and currentUser already ran.
export function createCurrentUserRoutes(
  users: UserRepository,
  manualGroups: ManualGroupRepository,
) {
  return (
    new Hono<AuthenticatedEnv>()
      .get("/", (c) => {
        const claims = c.get("jwtPayload");
        const user = c.get("user");
        // Typed from currentUserSchema so the admin SPA's parse cannot drift from what
        // this returns.
        const currentUser: CurrentUser = {
          sub: claims.sub,
          username: claims.preferred_username,
          name: claims.name,
          email: claims.email,
          orcid: user.orcid,
          status: user.status,
          superAdmin: user.superAdmin,
          institutionalOrganization: user.institutionalOrganization,
          institutionalOsu: user.institutionalOsu,
          institutionalLaboratory: user.institutionalLaboratory,
        };
        return c.json(currentUser);
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
      // ponytail: no requireActiveSession, unlike orcid: groups grant no rights and are not a login credential. Accepted ceiling: first-set-only until ticket 115, so a stolen token could misattribute an institution irreversibly onto every later sample
      .put(
        "/institutional-groups",
        validateSetInstitutionalGroupsBody,
        async (c) => {
          const updated = await users.setInstitutionalGroups(
            c.get("user").id,
            c.req.valid("json"),
          );
          if (!updated) {
            return c.json({ error: "Institutional groups already set" }, 409);
          }
          return c.body(null, 204);
        },
      )
      .get("/manual-groups", async (c) => {
        const { id } = c.get("user");
        const [data, published] = await Promise.all([
          manualGroups.listForUser(id),
          users.hasPublishedSample(id),
        ]);
        const body: MyManualGroupsResponse = {
          data,
          meta: { canLeave: !published },
        };
        return c.json(body);
      })
      // A published sample is attributed to the groups its owner belonged to,
      // so leaving stays open only while the caller owns no published sample.
      // TODO: block on a published sample attached to the group instead, once a
      // sample can carry one (ADR 0025).
      .delete("/manual-groups/:id", validateManualGroupIdParam, async (c) => {
        const { id } = c.get("user");
        if (await users.hasPublishedSample(id)) {
          return c.json({ reason: "has_published_sample" }, 403);
        }
        await manualGroups.removeMember(c.req.valid("param").id, id);
        return c.body(null, 204);
      })
  );
}
