import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { MiddlewareHandler } from "hono";

import { isSpaceManager } from "@projet-igsn/domain/user/is-space-manager";
import {
  managerScope,
  superAdminScope,
} from "@projet-igsn/domain/user/moderation-scope";
import { HTTPException } from "hono/http-exception";

import type { AuthenticatedEnv } from "./current-user.ts";

export type ModerationEnv = {
  Variables: AuthenticatedEnv["Variables"] & { scope: ModerationScope };
};

export function requireUserModeration(
  users: UserRepository,
): MiddlewareHandler<ModerationEnv> {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    if (user.superAdmin) {
      c.set("scope", superAdminScope(user.id));
    } else {
      const groups = await users.getModerationScope(user.id);
      if (!isSpaceManager(groups)) {
        throw new HTTPException(403, { message: "Forbidden" });
      }
      c.set("scope", managerScope(user.id, groups));
    }
    await next();
  };
}
