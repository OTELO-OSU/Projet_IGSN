import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type {
  AdminUserResponse,
  ListUsersResponse,
  UserIdentitiesResponse,
} from "@projet-igsn/domain/user/user-validator";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireSuperAdmin } from "../auth/require-super-admin.ts";
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

export function createUserSearchRoutes(userRepository: UserRepository) {
  return new Hono<AuthenticatedEnv>().get(
    "/",
    validateSearchUsersQuery,
    async (c) => {
      const { search, excludeCollaboratorsOf, status } = c.req.valid("query");
      const body: UserIdentitiesResponse = {
        data: await userRepository.search(
          search,
          c.get("user").id,
          excludeCollaboratorsOf,
          status,
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
  return new Hono<AuthenticatedEnv>()
    .use("*", requireSuperAdmin)
    .get("/", validateListUsersQuery, async (c) => {
      const { data, total } = await repository.list(c.req.valid("query"));
      const body: ListUsersResponse = { data, meta: { total } };
      return c.json(body);
    })
    .get("/:id", validateUserIdParam, async (c) => {
      const user = await repository.get(c.req.valid("param").id);
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
          await repository.update(id, c.req.valid("json"));

        const actor = c.get("user");
        if (previousStatus !== user.status) {
          console.info("user status changed", {
            actor: actor.id,
            target: user.id,
            status: user.status,
          });
        }
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
    );
}
