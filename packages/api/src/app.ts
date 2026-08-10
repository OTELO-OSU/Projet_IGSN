import type { Kysely } from "kysely";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import type { DB } from "./db.ts";
import type { SendMail } from "./mail/send-mail.ts";

import { type AuthenticatedEnv, currentUser } from "./auth/current-user.ts";
import { requireAuth } from "./auth/middleware.ts";
import { loadRateLimitConfig } from "./rate-limit/config.ts";
import { rateLimit } from "./rate-limit/middleware.ts";
import { createSampleAdminRoutes } from "./sample/admin-routes.ts";
import { createSampleAttachmentRepository } from "./sample/attachment-repository.ts";
import { createSampleRepository } from "./sample/repository.ts";
import { createSampleRoutes } from "./sample/routes.ts";
import { createUserSampleRepository } from "./user-sample/repository.ts";
import { createCurrentUserRoutes } from "./user/current-user-routes.ts";
import { createUserRepository } from "./user/repository.ts";
import { createUserRoutes, createUserSearchRoutes } from "./user/routes.ts";

export function createApp(
  database: Kysely<DB>,
  {
    // Local disk for now; a Ceph mount will take over this path (ADR 0017).
    attachmentsDir = process.env.ATTACHMENTS_DIR ?? "attachments",
    mail,
  }: {
    attachmentsDir?: string;
    mail?: { sendMail: SendMail; adminUrl: string };
  } = {},
) {
  const corsOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const rateLimitConfig = loadRateLimitConfig();

  const sampleRepository = createSampleRepository(database);
  const sampleAttachmentRepository = createSampleAttachmentRepository(
    database,
    attachmentsDir,
  );
  const userRepository = createUserRepository(database);
  const userSampleRepository = createUserSampleRepository(database);

  // It sits under the global cors below, so a 429 still carries the allow-origin
  // header the admin SPA needs to read it, and cors answers a preflight before
  // it runs.
  const publicSampleRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .route(
      "/",
      createSampleRoutes(sampleRepository, sampleAttachmentRepository),
    );

  const adminRoutes = new Hono<AuthenticatedEnv>()
    .use("*", requireAuth)
    // After requireAuth, so the budget is keyed by the verified sub, and before
    // currentUser, so a refused request costs no user upsert.
    .use("*", rateLimit(rateLimitConfig, "user"))
    .use("*", currentUser(userRepository))
    .route("/currentUser", createCurrentUserRoutes(userRepository))
    .route(
      "/samples",
      createSampleAdminRoutes(
        sampleRepository,
        sampleAttachmentRepository,
        userSampleRepository,
        mail,
      ),
    )
    // Registered first: the directory search is open to any authenticated user,
    // where createUserRoutes is super-admin-only throughout.
    .route("/users/search", createUserSearchRoutes(userRepository))
    .route("/users", createUserRoutes(userRepository, mail));

  const app = new Hono<AuthenticatedEnv>()
    .use(
      "*",
      cors({
        origin: (origin) => (corsOrigins.includes(origin) ? origin : null),
        credentials: true,
        allowHeaders: ["Authorization", "Content-Type"],
        // None of these are CORS-safelisted, so without this the admin SPA
        // cannot read how long a 429 asks it to wait, nor what budget it hit.
        exposeHeaders: [
          "Retry-After",
          "RateLimit-Limit",
          "RateLimit-Remaining",
          "RateLimit-Reset",
        ],
      }),
    )
    // The cause is logged, never serialised: a driver message can carry SQL
    // or a connection string.
    .onError((error, c) => {
      if (error instanceof HTTPException) return error.getResponse();
      console.error("unhandled api error", error);
      return c.json({ error: "Internal server error" }, 500);
    })
    .get("/", (c) => c.json({ message: "OK" }))
    .route("/samples", publicSampleRoutes)
    .route("/admin", adminRoutes);

  return { app };
}
