import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type {
  ListUsersResponse,
  UserIdentitiesResponse,
  UserResponse,
} from "@projet-igsn/domain/user/user-validator";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireSuperAdmin } from "../auth/require-super-admin.ts";
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
      const body: UserIdentitiesResponse = {
        data: await userRepository.search(
          c.req.valid("query").search,
          c.get("user").id,
        ),
      };
      return c.json(body);
    },
  );
}

// Moderating accounts is super-admin-only: the guard sits on the mount so it
// travels with these routes rather than with a path glob in app.ts.
export function createUserRoutes(repository: UserRepository) {
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
          const body: UserResponse = { data: user };
          return c.json(body);
        },
      )
  );
}
