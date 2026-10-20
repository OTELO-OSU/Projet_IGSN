import { canPublishSamples } from "@projet-igsn/domain/user/can-publish-samples";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { AuthenticatedEnv } from "./current-user.ts";

export const requirePublisher = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    if (!canPublishSamples(c.get("user"))) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  },
);
