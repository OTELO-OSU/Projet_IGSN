import { canManageManualGroup } from "@projet-igsn/domain/user/can-manage-manual-group";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { ModerationEnv } from "../auth/require-user-moderation.ts";

export const requireManagedGroup = createMiddleware<ModerationEnv>(
  async (c, next) => {
    if (!canManageManualGroup(c.get("scope"), c.req.param("id")!)) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  },
);
