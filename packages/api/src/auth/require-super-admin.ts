import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { AuthenticatedEnv } from "./current-user.ts";

export const requireSuperAdmin = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    if (!c.get("user")?.superAdmin) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  },
);
