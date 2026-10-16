import type {
  ListManualGroupsResponse,
  ManualGroupResponse,
} from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { Hono } from "hono";

import type { ModerationEnv } from "../auth/require-user-moderation.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireSuperAdmin } from "../auth/require-super-admin.ts";
import { requireUserModeration } from "../auth/require-user-moderation.ts";
import { notifySuperAdmins } from "../mail/notify-super-admins.ts";
import { createManualGroupManagerRoutes } from "./manager-routes.ts";
import { NOT_FOUND } from "./manual-group-not-found.ts";
import { manualGroupRequestMail } from "./manual-group-request-mail.ts";
import { createManualGroupMemberRoutes } from "./member-routes.ts";
import { requireManagedGroup } from "./require-managed-group.ts";
import {
  validateCreateManualGroupBody,
  validateListManualGroupsQuery,
  validateManualGroupIdParam,
  validateManualGroupNameBody,
  validateRequestManualGroupBody,
} from "./validator.ts";

const NAME_TAKEN = { error: "Manual group name already taken" } as const;

export function createManualGroupRoutes(
  repository: ManualGroupRepository,
  users: UserRepository,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  return new Hono<ModerationEnv>()
    .use("*", requireUserModeration(users))
    .get("/", validateListManualGroupsQuery, async (c) => {
      const scope = c.get("scope");
      const { data, total } = await repository.list(
        c.req.valid("query"),
        scope.superAdmin ? null : scope.managedManualGroupIds,
      );
      const body: ListManualGroupsResponse = { data, meta: { total } };
      return c.json(body);
    })
    .post(
      "/",
      requireSuperAdmin,
      requireActiveSession,
      validateCreateManualGroupBody,
      async (c) => {
        const { name, managerIds } = c.req.valid("json");
        const created = await repository.create(name, managerIds);
        if (created === "name_taken") {
          return c.json(NAME_TAKEN, 409);
        }
        const body: ManualGroupResponse = { data: created.group };
        return c.json(body, 201);
      },
    )
    .post(
      "/requests",
      requireActiveSession,
      validateRequestManualGroupBody,
      async (c) => {
        const { name, managerIds } = c.req.valid("json");
        const requester = c.get("user");
        const wanted = [...new Set(managerIds)];
        const managers = await users.search(requester.id, { ids: wanted });
        if (managers.length !== wanted.length) {
          return c.json({ error: "User not found" }, 404);
        }
        if (mail) {
          // ponytail: fire and forget; a retry queue if a lost request ever matters.
          void notifySuperAdmins(
            users,
            () =>
              manualGroupRequestMail({
                requester,
                name,
                managers,
                adminUrl: mail.adminUrl,
              }),
            mail.sendMail,
            "Could not mail the manual group creation request",
          );
        }
        return c.body(null, 204);
      },
    )
    .get("/:id", validateManualGroupIdParam, requireManagedGroup, async (c) => {
      const group = await repository.get(c.req.valid("param").id);
      if (!group) {
        return c.json(NOT_FOUND, 404);
      }
      const body: ManualGroupResponse = { data: group };
      return c.json(body);
    })
    .put(
      "/:id",
      requireSuperAdmin,
      validateManualGroupIdParam,
      validateManualGroupNameBody,
      async (c) => {
        const renamed = await repository.rename(
          c.req.valid("param").id,
          c.req.valid("json").name,
        );
        if (renamed === "not_found") {
          return c.json(NOT_FOUND, 404);
        }
        if (renamed === "name_taken") {
          return c.json(NAME_TAKEN, 409);
        }
        const body: ManualGroupResponse = { data: renamed.group };
        return c.json(body);
      },
    )
    .delete(
      "/:id",
      requireSuperAdmin,
      requireActiveSession,
      validateManualGroupIdParam,
      async (c) => {
        const removed = await repository.remove(c.req.valid("param").id);
        if (removed === "not_found") {
          return c.json(NOT_FOUND, 404);
        }
        if (removed === "has_published_sample") {
          return c.json({ reason: "has_published_sample" }, 409);
        }
        return c.body(null, 204);
      },
    )
    .route("/", createManualGroupManagerRoutes(repository))
    .route("/", createManualGroupMemberRoutes(repository, mail));
}
