import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { GroupManagersResponse } from "@projet-igsn/domain/user/user-validator";

import { addGroupManagerBodySchema } from "@projet-igsn/domain/user/user-validator";
import { Hono } from "hono";

import type { ModerationEnv } from "../auth/require-user-moderation.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireSuperAdmin } from "../auth/require-super-admin.ts";
import { zodValidator } from "../zod-validator.ts";
import { NOT_FOUND } from "./manual-group-not-found.ts";
import {
  validateManualGroupIdParam,
  validateManualGroupMemberParams,
} from "./validator.ts";

const logManagementChange = (actor: string, group: string, target: string) =>
  console.info("manual group management changed", { actor, group, target });

export function createManualGroupManagerRoutes(
  repository: ManualGroupRepository,
) {
  return new Hono<ModerationEnv>()
    .get(
      "/:id/managers",
      requireSuperAdmin,
      validateManualGroupIdParam,
      async (c) => {
        const { id } = c.req.valid("param");
        const [group, managers] = await Promise.all([
          repository.get(id),
          repository.listManagers(id),
        ]);
        if (!group) {
          return c.json(NOT_FOUND, 404);
        }
        const body: GroupManagersResponse = { data: managers };
        return c.json(body);
      },
    )
    .post(
      "/:id/managers",
      requireSuperAdmin,
      requireActiveSession,
      validateManualGroupIdParam,
      zodValidator("json", addGroupManagerBodySchema, "Invalid user id"),
      async (c) => {
        const { id } = c.req.valid("param");
        const { userId } = c.req.valid("json");
        if (!(await repository.get(id))) {
          return c.json(NOT_FOUND, 404);
        }
        await repository.addManager(id, userId);
        logManagementChange(c.get("user").id, id, userId);
        return c.body(null, 204);
      },
    )
    .delete(
      "/:id/managers/:userId",
      requireSuperAdmin,
      requireActiveSession,
      validateManualGroupMemberParams,
      async (c) => {
        const { id, userId } = c.req.valid("param");
        if (!(await repository.get(id))) {
          return c.json(NOT_FOUND, 404);
        }
        await repository.removeManager(id, userId);
        logManagementChange(c.get("user").id, id, userId);
        return c.body(null, 204);
      },
    );
}
