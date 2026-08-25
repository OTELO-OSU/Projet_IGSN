import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type {
  AdminUserResponse,
  ListUsersResponse,
  UserIdentitiesResponse,
} from "@projet-igsn/domain/user/user-validator";

import { canModerateUsers } from "@projet-igsn/domain/user/can-moderate-users";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { AuthenticatedEnv } from "../auth/current-user.ts";
import type { ModerationEnv } from "../auth/require-user-moderation.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireUserModeration } from "../auth/require-user-moderation.ts";
import {
  logMembershipChange,
  notifyManualGroupJoined,
} from "../manual-group/notify-manual-group-joined.ts";
import { sendUserAcceptedMail } from "./send-user-accepted-mail.ts";
import {
  validateListUsersQuery,
  validateSearchUsersQuery,
  validateUpdateUserBody,
  validateUserIdParam,
} from "./validator.ts";

const requireUserModerator = createMiddleware<ModerationEnv>(
  async (c, next) => {
    if (!canModerateUsers(c.get("scope"))) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  },
);

const logStatusChange = (
  actor: string,
  target: string,
  previous: UserStatus,
  status: UserStatus,
) => {
  if (previous !== status) {
    console.info("user status changed", { actor, target, status });
  }
};

export function createUserSearchRoutes(userRepository: UserRepository) {
  return new Hono<AuthenticatedEnv>().get(
    "/",
    validateSearchUsersQuery,
    async (c) => {
      const body: UserIdentitiesResponse = {
        data: await userRepository.search(
          c.get("user").id,
          c.req.valid("query"),
        ),
      };
      return c.json(body);
    },
  );
}

export function createUserRoutes(
  repository: UserRepository,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  return new Hono<ModerationEnv>()
    .use("*", requireUserModeration(repository))
    .use("*", requireUserModerator)
    .get("/", validateListUsersQuery, async (c) => {
      const { data, total } = await repository.list(
        c.req.valid("query"),
        c.get("scope"),
      );
      const body: ListUsersResponse = { data, meta: { total } };
      return c.json(body);
    })
    .get("/:id", validateUserIdParam, async (c) => {
      const user = await repository.get(
        c.req.valid("param").id,
        c.get("scope"),
      );
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }
      const body: AdminUserResponse = { data: user };
      return c.json(body);
    })
    .put(
      "/:id",
      requireActiveSession,
      validateUserIdParam,
      validateUpdateUserBody,
      async (c) => {
        const id = c.req.valid("param").id;
        const { user, previousStatus, joinedGroups, leftGroupIds } =
          await repository.update(id, c.req.valid("json"), c.get("scope"));

        const actor = c.get("user");
        logStatusChange(actor.id, user.id, previousStatus, user.status);
        if (
          mail &&
          previousStatus !== "accepted" &&
          user.status === "accepted"
        ) {
          // ponytail: fire and forget, so an unreachable SMTP cannot hold the response for nodemailer's two-minute default; a retry queue if a lost notification ever matters.
          void sendUserAcceptedMail(user, mail.sendMail, mail.adminUrl);
        }
        notifyManualGroupJoined({
          actor,
          invitee: user,
          groups: joinedGroups,
          mail,
        });
        for (const groupId of leftGroupIds) {
          logMembershipChange(actor.id, groupId, user.id);
        }

        const body: AdminUserResponse = { data: user };
        return c.json(body);
      },
    )
    .delete(
      "/:id/institutional-groups",
      requireActiveSession,
      validateUserIdParam,
      async (c) => {
        const id = c.req.valid("param").id;
        const { previousStatus, status } =
          await repository.removeInstitutionalGroups(id, c.get("scope"));
        logStatusChange(c.get("user").id, id, previousStatus, status);
        return c.body(null, 204);
      },
    );
}
