import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { KeycloakClaims } from "./middleware.ts";

// Runs after requireAuth: 403 unless the verified token carries the realm role
// (GaiaData REQ-TOKEN-04, roles). Attach per protected route as endpoints land;
// see .claude/rules/security-backend.md.
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
