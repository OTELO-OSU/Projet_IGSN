import type { Kysely } from "kysely";

import { bboxSchema } from "@projet-igsn/domain/sample/sample-validator";
import { Hono, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import type { DB } from "./db.ts";
import type { SendMail } from "./mail/send-mail.ts";

import { attachmentsDir as defaultAttachmentsDir } from "./attachments-dir.ts";
import { type AuthenticatedEnv, currentUser } from "./auth/current-user.ts";
import { requireAuth } from "./auth/middleware.ts";
import { dataCiteConfig } from "./datacite/config.ts";
import { createInstitutionalGroupRepository } from "./institutional-group/repository.ts";
import { createInstitutionalGroupRoutes } from "./institutional-group/routes.ts";
import { createPublicManualGroupRoutes } from "./manual-group/public-routes.ts";
import { createManualGroupRepository } from "./manual-group/repository.ts";
import { createManualGroupRoutes } from "./manual-group/routes.ts";
import {
  CONTACT_MAIL_IP_BUDGET,
  MAP_IP_BUDGET,
  IMPORT_TEMPLATE_USER_BUDGET,
  MAIL_REQUEST_USER_BUDGET,
  UPLOAD_USER_BUDGET,
  loadRateLimitConfig,
} from "./rate-limit/config.ts";
import { type RateLimitEnv, rateLimit } from "./rate-limit/middleware.ts";
import { createSampleBatchRepository } from "./sample-batch/repository.ts";
import { createSampleAdminRoutes } from "./sample/admin-routes.ts";
import { createSampleAttachmentRepository } from "./sample/attachment-repository.ts";
import { createSampleChildRoutes } from "./sample/child-routes.ts";
import { createSampleParentRoutes } from "./sample/parent-routes.ts";
import { createSampleRepository } from "./sample/repository.ts";
import { createSampleRoutes } from "./sample/routes.ts";
import { createServiceAccountOwnerRoutes } from "./service-account/owner-routes.ts";
import { createServiceAccountRepository } from "./service-account/repository.ts";
import { createServiceAccountRoutes } from "./service-account/routes.ts";
import { createServiceRoutes } from "./service-account/service-routes.ts";
import { createStagedUploadRoutes } from "./staged-upload/routes.ts";
import { createStagedUploads } from "./staged-upload/staged-uploads.ts";
import { createTusServer } from "./staged-upload/tus-server.ts";
import { createStatsRepository } from "./stats/repository.ts";
import { createStatsRoutes } from "./stats/routes.ts";
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
    attachmentsDir = defaultAttachmentsDir,
    frontendUrl = "http://localhost:3000/",
    mail,
  }: {
    attachmentsDir?: string;
    frontendUrl?: string;
    mail?: { sendMail: SendMail; adminUrl: string; frontendUrl: string };
  } = {},
) {
  const corsOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const rateLimitConfig = loadRateLimitConfig();
  const userRateLimit = rateLimit(rateLimitConfig, "user");
  const uploadRateLimit = rateLimit(
    rateLimitConfig,
    "user",
    UPLOAD_USER_BUDGET,
  );
  const adminRateLimit: MiddlewareHandler<RateLimitEnv> = (c, next) =>
    c.req.path.startsWith("/admin/samples/import/uploads")
      ? uploadRateLimit(c, next)
      : userRateLimit(c, next);
  const importRateLimit = rateLimit(
    rateLimitConfig,
    "user",
    IMPORT_TEMPLATE_USER_BUDGET,
  );

  const sampleRepository = createSampleRepository(
    database,
    attachmentsDir,
    dataCiteConfig(),
  );
  const sampleAttachmentRepository = createSampleAttachmentRepository(
    database,
    attachmentsDir,
  );
  const stagedUploads = createStagedUploads(attachmentsDir);
  const tusServer = createTusServer(attachmentsDir, stagedUploads);
  const userRepository = createUserRepository(database);
  const userSampleRepository = createUserSampleRepository(database);
  const manualGroupRepository = createManualGroupRepository(database);
  const institutionalGroupRepository =
    createInstitutionalGroupRepository(database);
  const serviceAccountRepository = createServiceAccountRepository(database);

  const publicRateLimit = rateLimit(rateLimitConfig, "ip");
  const mapRateLimit = rateLimit(rateLimitConfig, "ip", MAP_IP_BUDGET);
  const publicSampleRoutes = new Hono<RateLimitEnv>()
    .use("*", (c, next) =>
      c.req.path.endsWith("/samples/map") ||
      (c.req.path.endsWith("/samples") &&
        bboxSchema.safeParse(c.req.query("viewport")).success)
        ? mapRateLimit(c, next)
        : publicRateLimit(c, next),
    )
    .use(
      "/:igsn/contact/*",
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

  const publicStatsRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .route("/", createStatsRoutes(createStatsRepository(database)));

  const publicUserRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .route("/", createPublicUserRoutes(userRepository));

  const serviceRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .use(
      "/samples/batch",
      rateLimit(rateLimitConfig, "ip", IMPORT_TEMPLATE_USER_BUDGET),
    )
    .route(
      "/",
      createServiceRoutes(
        serviceAccountRepository,
        sampleRepository,
        manualGroupRepository,
        frontendUrl,
        userSampleRepository,
        createSampleBatchRepository(database),
        mail,
      ),
    );

  const adminRoutes = new Hono<AuthenticatedEnv>()
    .use("*", requireAuth)
    .use("*", adminRateLimit)
    .use("*", currentUser(userRepository))
    .route(
      "/currentUser",
      createCurrentUserRoutes(userRepository, manualGroupRepository, mail),
    )
    .use(
      "/currentUser/service-accounts/requests",
      rateLimit(rateLimitConfig, "user", MAIL_REQUEST_USER_BUDGET),
    )
    .route(
      "/currentUser/service-accounts",
      createServiceAccountOwnerRoutes(
        serviceAccountRepository,
        userRepository,
        manualGroupRepository,
        mail,
      ),
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
    .route("/samples/import/uploads", createStagedUploadRoutes(tusServer))
    .use("/samples/import-template", importRateLimit)
    .use("/samples/import-template/reservation", importRateLimit)
    .use("/samples/import", importRateLimit)
    .use(
      "/samples/import/duplicates",
      rateLimit(rateLimitConfig, "user", IMPORT_TEMPLATE_USER_BUDGET),
    )
    .use("/samples/bulk-edit", importRateLimit)
    .use(
      "/samples/import/internal-id-request",
      rateLimit(rateLimitConfig, "user", MAIL_REQUEST_USER_BUDGET),
    )
    .use(
      "/samples/export",
      rateLimit(rateLimitConfig, "user", IMPORT_TEMPLATE_USER_BUDGET),
    )
    .route(
      "/samples/parents",
      createSampleParentRoutes(sampleRepository, userRepository),
    )
    .route(
      "/samples/children",
      createSampleChildRoutes(sampleRepository, userRepository),
    )
    .route(
      "/samples",
      createSampleAdminRoutes(
        sampleRepository,
        sampleAttachmentRepository,
        userSampleRepository,
        manualGroupRepository,
        userRepository,
        stagedUploads,
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
        allowHeaders: [
          "Authorization",
          "Content-Type",
          "Tus-Resumable",
          "Upload-Length",
          "Upload-Metadata",
          "Upload-Offset",
        ],
        exposeHeaders: [
          "Location",
          "Upload-Offset",
          "Upload-Length",
          "Tus-Resumable",
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
    .route("/stats", publicStatsRoutes)
    .route("/users", publicUserRoutes)
    .route("/service", serviceRoutes)
    .route("/admin", adminRoutes);

  return { app };
}
