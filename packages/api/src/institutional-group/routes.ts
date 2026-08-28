import type { InstitutionalGroupRepository } from "@projet-igsn/domain/institutional-group/repository";
import type {
  GroupManagersResponse,
  InstitutionalGroupCountsResponse,
} from "@projet-igsn/domain/user/user-validator";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { validateAddGroupManagerBody } from "../add-group-manager-body.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { requireSuperAdmin } from "../auth/require-super-admin.ts";
import {
  validateInstitutionalGroupManagerParams,
  validateInstitutionalGroupRefParams,
} from "./validator.ts";

const logManagementChange = (
  actor: string,
  group: { kind: string; code: string },
  target: string,
) =>
  console.info("institutional group management changed", {
    actor,
    group: `${group.kind}:${group.code}`,
    target,
  });

export function createInstitutionalGroupRoutes(
  repository: InstitutionalGroupRepository,
) {
  return new Hono<AuthenticatedEnv>()
    .use("*", requireSuperAdmin)
    .get("/manager-counts", async (c) => {
      const body: InstitutionalGroupCountsResponse = {
        data: await repository.countActiveManagers(),
      };
      return c.json(body);
    })
    .get(
      "/:kind/:code/managers",
      validateInstitutionalGroupRefParams,
      async (c) => {
        const body: GroupManagersResponse = {
          data: await repository.listManagers(c.req.valid("param")),
        };
        return c.json(body);
      },
    )
    .post(
      "/:kind/:code/managers",
      requireActiveSession,
      validateInstitutionalGroupRefParams,
      validateAddGroupManagerBody,
      async (c) => {
        const ref = c.req.valid("param");
        const { userId } = c.req.valid("json");
        await repository.addManager(ref, userId);
        logManagementChange(c.get("user").id, ref, userId);
        return c.body(null, 204);
      },
    )
    .delete(
      "/:kind/:code/managers/:userId",
      requireActiveSession,
      validateInstitutionalGroupManagerParams,
      async (c) => {
        const { userId, ...ref } = c.req.valid("param");
        await repository.removeManager(ref, userId);
        logManagementChange(c.get("user").id, ref, userId);
        return c.body(null, 204);
      },
    );
}
