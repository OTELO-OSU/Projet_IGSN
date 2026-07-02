import type { Kysely } from "kysely";

import { Hono } from "hono";
import { cors } from "hono/cors";

import type { DB } from "./db.ts";

import { type KeycloakClaims, requireAuth } from "./auth/middleware.ts";
import { createSampleRepository } from "./sample/repository.ts";
import { createSampleRoutes } from "./sample/routes.ts";

export function createApp(database: Kysely<DB>) {
  const corsOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  return (
    new Hono<{ Variables: { jwtPayload: KeycloakClaims } }>()
      .use(
        "*",
        cors({
          // Reflect the request origin only if it is in CORS_ORIGINS (comma-separated).
          // Empty/unset => deny all. No "*": forbidden together with credentials.
          origin: (origin) => (corsOrigins.includes(origin) ? origin : null),
          credentials: true,
          // The admin SPA sends the Keycloak access token as a bearer header.
          allowHeaders: ["Authorization"],
        }),
      )
      .get("/", (c) => c.json({ message: "OK" }))
      // Protected dummy route: proves the admin's Keycloak token verifies server-side.
      // Echoes back who the verified token says you are.
      .get("/me", requireAuth, (c) => {
        const claims = c.get("jwtPayload");
        return c.json({
          sub: claims.sub,
          username: claims.preferred_username,
          name: claims.name,
          email: claims.email,
        });
      })
      .route("/samples", createSampleRoutes(createSampleRepository(database)))
  );
}
