import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { KeycloakClaims } from "./middleware.ts";

export const requireRole = (role: string) =>
  createMiddleware<{ Variables: { jwtPayload: KeycloakClaims } }>(
    async (c, next) => {
      const roles = c.get("jwtPayload")?.realm_access?.roles ?? [];
      if (!roles.includes(role)) {
        throw new HTTPException(403, { message: "Forbidden" });
      }
      await next();
    },
  );
