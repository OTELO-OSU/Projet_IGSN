import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { AuthenticatedEnv } from "./current-user.ts";

export const requireCharterAccepted = (
  users: Pick<UserRepository, "hasAcceptedCharter">,
) =>
  createMiddleware<AuthenticatedEnv>(async (c, next) => {
    if (!(await users.hasAcceptedCharter(c.get("user").id))) {
      throw new HTTPException(403, { message: "Charter not accepted" });
    }
    await next();
  });
