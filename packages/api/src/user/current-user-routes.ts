import type { MyManualGroupsResponse } from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { CurrentUser } from "@projet-igsn/domain/user/current-user";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { managedLaboratoryCodes } from "@projet-igsn/domain/user/managed-laboratory-codes";
import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { validateManualGroupIdParam } from "../manual-group/validator.ts";
import {
  validateSetInstitutionalGroupsBody,
  validateSetOrcidBody,
} from "./validator.ts";

export function createCurrentUserRoutes(
  users: UserRepository,
  manualGroups: ManualGroupRepository,
) {
  return new Hono<AuthenticatedEnv>()
    .get("/", async (c) => {
      const claims = c.get("jwtPayload");
      const user = c.get("user");
      const managed = await users.getModerationScope(user.id);
      const currentUser: CurrentUser = {
        sub: claims.sub,
        username: claims.preferred_username,
        name: claims.name,
        email: claims.email,
        orcid: user.orcid,
        status: user.status,
        superAdmin: user.superAdmin,
        managedLaboratories: managedLaboratoryCodes(managed),
        institutionalOrganization: user.institutionalOrganization,
        institutionalOsu: user.institutionalOsu,
        institutionalLaboratory: user.institutionalLaboratory,
      };
      return c.json(currentUser);
    })
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
    .put(
      "/institutional-groups",
      requireActiveSession,
      validateSetInstitutionalGroupsBody,
      async (c) => {
        await users.setInstitutionalGroups(
          c.get("user").id,
          c.req.valid("json"),
        );
        return c.body(null, 204);
      },
    )
    .get("/manual-groups", async (c) => {
      const body: MyManualGroupsResponse = {
        data: await manualGroups.listForUser(c.get("user").id),
      };
      return c.json(body);
    })
    .delete("/manual-groups/:id", validateManualGroupIdParam, async (c) => {
      const { id } = c.get("user");
      const left = await manualGroups.leave(c.req.valid("param").id, id);
      if (left === "has_published_sample") {
        return c.json({ reason: "has_published_sample" }, 403);
      }
      return c.body(null, 204);
    });
}
