import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { AuthenticatedEnv } from "./current-user.ts";

// Runs after currentUser: moderation is super-admin-only, and the flag is a
// local column an admin sets in the database, never a token claim.
export const requireSuperAdmin = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    if (!c.get("user")?.superAdmin) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  },
);
