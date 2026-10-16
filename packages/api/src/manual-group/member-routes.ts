import type { ManualGroupMembersResponse } from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";

import { Hono } from "hono";

import type { ModerationEnv } from "../auth/require-user-moderation.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { NOT_FOUND } from "./manual-group-not-found.ts";
import {
  logMembershipChange,
  notifyManualGroupJoined,
} from "./notify-manual-group-joined.ts";
import { requireManagedGroup } from "./require-managed-group.ts";
import {
  validateAddManualGroupMemberBody,
  validateManualGroupIdParam,
  validateManualGroupMemberParams,
} from "./validator.ts";

export function createManualGroupMemberRoutes(
  repository: ManualGroupRepository,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  return new Hono<ModerationEnv>()
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
