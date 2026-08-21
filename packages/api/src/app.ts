import type { Kysely } from "kysely";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import type { DB } from "./db.ts";
import type { SendMail } from "./mail/send-mail.ts";

import { type AuthenticatedEnv, currentUser } from "./auth/current-user.ts";
import { requireAuth } from "./auth/middleware.ts";
import { createPublicManualGroupRoutes } from "./manual-group/public-routes.ts";
import { createManualGroupRepository } from "./manual-group/repository.ts";
import { createManualGroupRoutes } from "./manual-group/routes.ts";
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
  const manualGroupRepository = createManualGroupRepository(database);

  const publicSampleRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .route(
      "/",
      createSampleRoutes(sampleRepository, sampleAttachmentRepository),
    );

  const publicManualGroupRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .route("/", createPublicManualGroupRoutes(manualGroupRepository));

  const adminRoutes = new Hono<AuthenticatedEnv>()
    .use("*", requireAuth)
    .use("*", rateLimit(rateLimitConfig, "user"))
    .use("*", currentUser(userRepository))
    .route(
      "/currentUser",
      createCurrentUserRoutes(userRepository, manualGroupRepository),
    )
    .route(
      "/manual-groups",
      createManualGroupRoutes(manualGroupRepository, userRepository, mail),
    )
    .route(
      "/samples",
      createSampleAdminRoutes(
        sampleRepository,
        sampleAttachmentRepository,
        userSampleRepository,
        manualGroupRepository,
        mail,
      ),
    )
    .route("/users/search", createUserSearchRoutes(userRepository))
    .route("/users", createUserRoutes(userRepository, mail));

  const app = new Hono<AuthenticatedEnv>()
    .use(
      "*",
      cors({
        origin: (origin) => (corsOrigins.includes(origin) ? origin : null),
        credentials: true,
        allowHeaders: ["Authorization", "Content-Type"],
        exposeHeaders: [
          "Retry-After",
          "RateLimit-Limit",
          "RateLimit-Remaining",
          "RateLimit-Reset",
        ],
      }),
    )
    .onError((error, c) => {
      if (error instanceof HTTPException) {
        return c.json({ error: error.message }, error.status);
      }
      console.error("unhandled api error", error);
      return c.json({ error: "Internal server error" }, 500);
    })
    .get("/", (c) => c.json({ message: "OK" }))
    .route("/samples", publicSampleRoutes)
    .route("/manual-groups", publicManualGroupRoutes)
    .route("/admin", adminRoutes);

  return { app };
}
