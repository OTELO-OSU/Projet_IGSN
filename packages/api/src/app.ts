import type { Kysely } from "kysely";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import type { DB } from "./db.ts";

import { type AuthenticatedEnv, currentUser } from "./auth/current-user.ts";
import { requireAuth } from "./auth/middleware.ts";
import { createSampleAdminRoutes } from "./sample/admin-routes.ts";
import { createSampleAttachmentRepository } from "./sample/attachment-repository.ts";
import { createSampleRepository } from "./sample/repository.ts";
import { createSampleRoutes } from "./sample/routes.ts";
import { createUserRepository } from "./user/repository.ts";

export function createApp(
  database: Kysely<DB>,
  {
    // Local disk for now; a Ceph mount will take over this path (ADR 0017).
    attachmentsDir = process.env.ATTACHMENTS_DIR ?? "attachments",
  }: { attachmentsDir?: string } = {},
) {
  const corsOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const sampleRepository = createSampleRepository(database);
  const sampleAttachmentRepository = createSampleAttachmentRepository(
    database,
    attachmentsDir,
  );
  const userRepository = createUserRepository(database);

  // Every route under /admin requires a valid user token; the guard runs once
  // here rather than per admin route. currentUser then resolves the verified
  // claims to the local user the routes authorize against.
  const adminRoutes = new Hono<AuthenticatedEnv>()
    .use("*", requireAuth)
    .use("*", currentUser(userRepository))
    .get("/me", (c) => {
      const claims = c.get("jwtPayload");
      return c.json({
        sub: claims.sub,
        username: claims.preferred_username,
        name: claims.name,
        email: claims.email,
      });
    })
    .route(
      "/samples",
      createSampleAdminRoutes(sampleRepository, sampleAttachmentRepository),
    );

  return (
    new Hono<AuthenticatedEnv>()
      .use(
        "*",
        cors({
          origin: (origin) => (corsOrigins.includes(origin) ? origin : null),
          credentials: true,
          allowHeaders: ["Authorization", "Content-Type"],
        }),
      )
      // The cause is logged, never serialised: a driver message can carry SQL
      // or a connection string. An HTTPException (the auth guard's 401 and its
      // headers) already carries its own response.
      .onError((error, c) => {
        if (error instanceof HTTPException) return error.getResponse();
        console.error("unhandled api error", error);
        return c.json({ error: "Internal server error" }, 500);
      })
      .get("/", (c) => c.json({ message: "OK" }))
      .route(
        "/samples",
        createSampleRoutes(sampleRepository, sampleAttachmentRepository),
      )
      .route("/admin", adminRoutes)
  );
}
