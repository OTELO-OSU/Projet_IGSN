import type { Kysely } from "kysely";

import { Hono } from "hono";
import { cors } from "hono/cors";

import type { DB } from "./db.ts";

import { type KeycloakClaims, requireAuth } from "./auth/middleware.ts";
import { createSampleAdminRoutes } from "./sample/admin-routes.ts";
import { createSampleAttachmentRepository } from "./sample/attachment-repository.ts";
import { createSampleRepository } from "./sample/repository.ts";
import { createSampleRoutes } from "./sample/routes.ts";

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

  // Every route under /admin requires a valid user token; the guard runs once
  // here rather than per admin route.
  const adminRoutes = new Hono<{ Variables: { jwtPayload: KeycloakClaims } }>()
    .use("*", requireAuth)
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

  return new Hono<{ Variables: { jwtPayload: KeycloakClaims } }>()
    .use(
      "*",
      cors({
        origin: (origin) => (corsOrigins.includes(origin) ? origin : null),
        credentials: true,
        allowHeaders: ["Authorization", "Content-Type"],
      }),
    )
    .get("/", (c) => c.json({ message: "OK" }))
    .route(
      "/samples",
      createSampleRoutes(sampleRepository, sampleAttachmentRepository),
    )
    .route("/admin", adminRoutes);
}
