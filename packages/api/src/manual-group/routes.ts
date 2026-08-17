import type {
  ListManualGroupsResponse,
  ManualGroupMembersResponse,
  ManualGroupResponse,
} from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireSuperAdmin } from "../auth/require-super-admin.ts";
import { trySendMail } from "../mail/try-send-mail.ts";
import { manualGroupInvitationMail } from "./manual-group-invitation-mail.ts";
import {
  validateAddManualGroupMemberBody,
  validateListManualGroupsQuery,
  validateManualGroupIdParam,
  validateManualGroupMemberParams,
  validateManualGroupNameBody,
} from "./validator.ts";

const NOT_FOUND = { error: "Manual group not found" } as const;
const NAME_TAKEN = { error: "Manual group name already taken" } as const;

function logMembershipChange(actor: string, group: string, target: string) {
  console.info("manual group membership changed", { actor, group, target });
}

export function createManualGroupRoutes(
  repository: ManualGroupRepository,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  return new Hono<AuthenticatedEnv>()
    .use("*", requireSuperAdmin)
    .get("/", validateListManualGroupsQuery, async (c) => {
      const { data, total } = await repository.list(c.req.valid("query"));
      const body: ListManualGroupsResponse = { data, meta: { total } };
      return c.json(body);
    })
    .post("/", validateManualGroupNameBody, async (c) => {
      const created = await repository.create(c.req.valid("json").name);
      if (created === "name_taken") {
        return c.json(NAME_TAKEN, 409);
      }
      const body: ManualGroupResponse = { data: created.group };
      return c.json(body, 201);
    })
    .get("/:id", validateManualGroupIdParam, async (c) => {
      const group = await repository.get(c.req.valid("param").id);
      if (!group) {
        return c.json(NOT_FOUND, 404);
      }
      const body: ManualGroupResponse = { data: group };
      return c.json(body);
    })
    .put(
      "/:id",
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
      requireActiveSession,
      validateManualGroupIdParam,
      async (c) => {
        const removed = await repository.remove(c.req.valid("param").id);
        if (removed === "not_found") {
          return c.json(NOT_FOUND, 404);
        }
        return c.body(null, 204);
      },
    )
    .get("/:id/members", validateManualGroupIdParam, async (c) => {
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
    })
    .post(
      "/:id/members",
      requireActiveSession,
      validateManualGroupIdParam,
      validateAddManualGroupMemberBody,
      async (c) => {
        const { id } = c.req.valid("param");
        const { userId } = c.req.valid("json");
        const group = await repository.get(id);
        if (!group) {
          return c.json(NOT_FOUND, 404);
        }
        const added = await repository.addMember(id, userId);
        if (added === "unknown_user") {
          return c.json({ error: "User not found" }, 404);
        }
        if (added === "user_not_invitable") {
          return c.json({ error: "User is not accepted" }, 422);
        }
        if (added === "already_member") {
          return c.body(null, 204);
        }
        logMembershipChange(c.get("user").id, id, userId);
        if (mail) {
          // ponytail: fire and forget; a retry queue if a lost notification ever matters.
          void trySendMail(
            added.added.email,
            () =>
              manualGroupInvitationMail({
                invitee: added.added,
                inviter: c.get("user"),
                groupName: group.name,
                settingsUrl: new URL("/settings", mail.adminUrl).toString(),
              }),
            mail.sendMail,
            "Could not mail the manual group invitation",
          );
        }
        return c.body(null, 204);
      },
    )
    .delete(
      "/:id/members/:userId",
      requireActiveSession,
      validateManualGroupMemberParams,
      async (c) => {
        const { id, userId } = c.req.valid("param");
        if (!(await repository.get(id))) {
          return c.json(NOT_FOUND, 404);
        }
        const removed = await repository.removeMember(id, userId);
        if (removed === "removed") {
          logMembershipChange(c.get("user").id, id, userId);
        }
        return c.body(null, 204);
      },
    );
}
