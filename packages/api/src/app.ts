import type { Kysely } from "kysely";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import type { DB } from "./db.ts";
import type { SendMail } from "./mail/send-mail.ts";

import { type AuthenticatedEnv, currentUser } from "./auth/current-user.ts";
import { requireAuth } from "./auth/middleware.ts";
import { createInstitutionalGroupRepository } from "./institutional-group/repository.ts";
import { createInstitutionalGroupRoutes } from "./institutional-group/routes.ts";
import { createPublicManualGroupRoutes } from "./manual-group/public-routes.ts";
import { createManualGroupRepository } from "./manual-group/repository.ts";
import { createManualGroupRoutes } from "./manual-group/routes.ts";
import {
  CONTACT_MAIL_IP_BUDGET,
  MAIL_REQUEST_USER_BUDGET,
  loadRateLimitConfig,
} from "./rate-limit/config.ts";
import { rateLimit } from "./rate-limit/middleware.ts";
import { createSampleAdminRoutes } from "./sample/admin-routes.ts";
import { createSampleAttachmentRepository } from "./sample/attachment-repository.ts";
import { createSampleRepository } from "./sample/repository.ts";
import { createSampleRoutes } from "./sample/routes.ts";
import { createServiceAccountRepository } from "./service-account/repository.ts";
import { createServiceAccountRoutes } from "./service-account/routes.ts";
import { createUserSampleRepository } from "./user-sample/repository.ts";
import { createCurrentUserRoutes } from "./user/current-user-routes.ts";
import { createPublicUserRoutes } from "./user/public-routes.ts";
import { createUserRepository } from "./user/repository.ts";
import {
  createUserInstitutionalCountsRoutes,
  createUserRoutes,
  createUserSearchRoutes,
} from "./user/routes.ts";

export function createApp(
  database: Kysely<DB>,
  {
    attachmentsDir = process.env.ATTACHMENTS_DIR ?? "attachments",
    mail,
  }: {
    attachmentsDir?: string;
    mail?: { sendMail: SendMail; adminUrl: string; frontendUrl: string };
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
  const institutionalGroupRepository =
    createInstitutionalGroupRepository(database);
  const serviceAccountRepository = createServiceAccountRepository(database);

  const publicSampleRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .use(
      "/:igsn/contact",
      rateLimit(rateLimitConfig, "ip", CONTACT_MAIL_IP_BUDGET),
    )
    .route(
      "/",
      createSampleRoutes(
        sampleRepository,
        sampleAttachmentRepository,
        userSampleRepository,
        mail,
      ),
    );

  const publicManualGroupRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .route("/", createPublicManualGroupRoutes(manualGroupRepository));

  const publicUserRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .route("/", createPublicUserRoutes(userRepository));

  const adminRoutes = new Hono<AuthenticatedEnv>()
    .use("*", requireAuth)
    .use("*", rateLimit(rateLimitConfig, "user"))
    .use("*", currentUser(userRepository))
    .route(
      "/currentUser",
      createCurrentUserRoutes(userRepository, manualGroupRepository, mail),
    )
    .route(
      "/institutional-groups",
      createInstitutionalGroupRoutes(institutionalGroupRepository),
    )
    .route(
      "/manual-groups",
      createManualGroupRoutes(manualGroupRepository, userRepository, mail),
    )
    .use(
      "/samples/:id/deletion-request",
      rateLimit(rateLimitConfig, "user", MAIL_REQUEST_USER_BUDGET),
    )
    .route(
      "/samples",
      createSampleAdminRoutes(
        sampleRepository,
        sampleAttachmentRepository,
        userSampleRepository,
        manualGroupRepository,
        userRepository,
        mail,
      ),
    )
    .route(
      "/service-accounts",
      createServiceAccountRoutes(serviceAccountRepository),
    )
    .route("/users/search", createUserSearchRoutes(userRepository))
    .route(
      "/users/institutional-counts",
      createUserInstitutionalCountsRoutes(userRepository),
    )
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
    .route("/users", publicUserRoutes)
    .route("/admin", adminRoutes);

  return { app };
}
