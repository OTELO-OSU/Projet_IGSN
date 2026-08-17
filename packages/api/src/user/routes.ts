import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type {
  ListUsersResponse,
  UserIdentitiesResponse,
  UserResponse,
} from "@projet-igsn/domain/user/user-validator";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireSuperAdmin } from "../auth/require-super-admin.ts";
import { sendUserAcceptedMail } from "./send-user-accepted-mail.ts";
import {
  validateListUsersQuery,
  validateSearchUsersQuery,
  validateSetUserStatusBody,
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
  return (
    new Hono<AuthenticatedEnv>()
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
        const body: UserResponse = { data: user };
        return c.json(body);
      })
      // Granting or revoking rights is critical, so this route alone revalidates
      // the caller's IdP session live (security-backend rule).
      .put(
        "/:id/status",
        requireActiveSession,
        validateUserIdParam,
        validateSetUserStatusBody,
        async (c) => {
          const previous = await repository.get(c.req.valid("param").id);
          const user = await repository.setStatus(
            c.req.valid("param").id,
            c.req.valid("json").status,
          );
          if (!user) {
            return c.json({ error: "User not found" }, 404);
          }
          // A rights change leaves a trace: ids only, never emails (PII).
          console.info("user status changed", {
            actor: c.get("user").id,
            target: user.id,
            status: user.status,
          });
          if (
            mail &&
            previous?.status !== "accepted" &&
            user.status === "accepted"
          ) {
            // ponytail: fire and forget, so an unreachable SMTP cannot hold the response for nodemailer's two-minute default; a retry queue if a lost notification ever matters.
            void sendUserAcceptedMail(user, mail.sendMail, mail.adminUrl);
          }
          const body: UserResponse = { data: user };
          return c.json(body);
        },
      )
  );
}
