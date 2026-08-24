import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { UserRepository } from "@projet-igsn/domain/user/repository";
import type { MiddlewareHandler } from "hono";

import { HTTPException } from "hono/http-exception";

import type { AuthenticatedEnv } from "./current-user.ts";

import { getModerationScope } from "./moderation-scope.ts";

export type ModerationEnv = {
  Variables: AuthenticatedEnv["Variables"] & { scope: ModerationScope };
};

export function requireUserModeration(
  users: UserRepository,
): MiddlewareHandler<ModerationEnv> {
  return async (c, next) => {
    const user = c.get("user");
    const scope = user ? await getModerationScope(users, user) : null;
    if (!scope) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    c.set("scope", scope);
    await next();
  };
}
