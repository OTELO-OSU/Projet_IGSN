import type {
  ListManualGroupsResponse,
  ManualGroupMembersResponse,
  ManualGroupResponse,
} from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { canManageManualGroup } from "@projet-igsn/domain/user/can-manage-manual-group";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { ModerationEnv } from "../auth/require-user-moderation.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireSuperAdmin } from "../auth/require-super-admin.ts";
import { requireUserModeration } from "../auth/require-user-moderation.ts";
import {
  logMembershipChange,
  notifyManualGroupJoined,
} from "./notify-manual-group-joined.ts";
import { sendManualGroupRequest } from "./send-manual-group-request.ts";
import {
  validateAddManualGroupMemberBody,
  validateCreateManualGroupBody,
  validateListManualGroupsQuery,
  validateManualGroupIdParam,
  validateManualGroupMemberParams,
  validateManualGroupNameBody,
  validateRequestManualGroupBody,
} from "./validator.ts";

const NOT_FOUND = { error: "Manual group not found" } as const;
const NAME_TAKEN = { error: "Manual group name already taken" } as const;

const requireManagedGroup = createMiddleware<ModerationEnv>(async (c, next) => {
  if (!canManageManualGroup(c.get("scope"), c.req.param("id")!)) {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  await next();
});

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
          void sendManualGroupRequest(
            users,
            { requester, name, managers },
            mail,
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
    .get(
      "/:id/members",
      validateManualGroupIdParam,
      requireManagedGroup,
      async (c) => {
        const { id } = c.req.valid("param");
        const [group, members] = await Promise.all([
          repository.get(id),
          repository.listMembers(id),
        ]);
        if (!group) {
          return c.json(NOT_FOUND, 404);
        }
        const body: ManualGroupMembersResponse = { data: members };
        return c.json(body);
      },
    )
    .post(
      "/:id/members",
      requireActiveSession,
      validateManualGroupIdParam,
      requireManagedGroup,
      validateAddManualGroupMemberBody,
      async (c) => {
        const { id } = c.req.valid("param");
        const { userId } = c.req.valid("json");
        const group = await repository.get(id);
        if (!group) {
          return c.json(NOT_FOUND, 404);
        }
        const added = await repository.addMember(id, userId);
        if (added === "already_member") {
          return c.body(null, 204);
        }
        notifyManualGroupJoined({
          actor: c.get("user"),
          invitee: { id: userId, ...added.added },
          groups: [group],
          mail,
        });
        return c.body(null, 204);
      },
    )
    .delete(
      "/:id/members/:userId",
      requireActiveSession,
      validateManualGroupMemberParams,
      requireManagedGroup,
      async (c) => {
        const { id, userId } = c.req.valid("param");
        if (!(await repository.get(id))) {
          return c.json(NOT_FOUND, 404);
        }
        const removed = await repository.removeMember(id, userId);
        if (removed === "has_published_sample") {
          return c.json({ reason: "has_published_sample" }, 409);
        }
        if (removed === "removed") {
          logMembershipChange(c.get("user").id, id, userId);
        }
        return c.body(null, 204);
      },
    );
}
