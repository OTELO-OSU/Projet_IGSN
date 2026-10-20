import type { Kysely } from "kysely";

import { ATTACHMENT_MAX_BYTES } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { IMPORT_MAX_BYTES } from "@projet-igsn/domain/sample/import/import-validator";
import { bboxSchema } from "@projet-igsn/domain/sample/sample-validator";
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { randomBytes } from "node:crypto";

import type { DB } from "./db.ts";
import type { SendMail } from "./mail/send-mail.ts";

import { attachmentsDir as defaultAttachmentsDir } from "./attachments-dir.ts";
import { type AuthenticatedEnv, currentUser } from "./auth/current-user.ts";
import { requireAuth } from "./auth/middleware.ts";
import { requirePublisher } from "./auth/require-publisher.ts";
import {
  type CaptchaConfig,
  DEFAULT_CAPTCHA_COST,
  createCaptcha,
} from "./captcha/captcha.ts";
import { createContactRoutes } from "./contact/routes.ts";
import { dataCiteConfig } from "./datacite/config.ts";
import { createInstitutionalGroupRepository } from "./institutional-group/repository.ts";
import { createInstitutionalGroupRoutes } from "./institutional-group/routes.ts";
import { createPublicManualGroupRoutes } from "./manual-group/public-routes.ts";
import { createManualGroupRepository } from "./manual-group/repository.ts";
import { createManualGroupRoutes } from "./manual-group/routes.ts";
import {
  ADMIN_IP_BUDGET,
  CONTACT_MAIL_IP_BUDGET,
  EXPORT_IP_BUDGET,
  MAP_IP_BUDGET,
  MAP_POINTS_IP_BUDGET,
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
import { createSampleSeriesRoutes } from "./sample/series-routes.ts";
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

const SERVICE_MAP_PATH = "/service/samples/map";
const MIB = 1024 * 1024;
const IMPORT_PATHS = new Set([
  "/admin/samples/import",
  "/admin/samples/import/duplicates",
  "/admin/samples/bulk-edit",
  "/service/samples/batch",
]);
const limitBody = (maxSize: number) =>
  bodyLimit({
    maxSize,
    onError: (c) => c.json({ error: "Payload too large" }, 413),
  });
const attachmentBodyLimit = limitBody(ATTACHMENT_MAX_BYTES + MIB);
const importBodyLimit = limitBody(IMPORT_MAX_BYTES + MIB);
const defaultBodyLimit = limitBody(MIB);
const largeBodyLimit = (path: string) =>
  path.startsWith("/admin/samples/import/uploads") ||
  /^\/admin\/samples\/[^/]+\/attachments$/.test(path)
    ? attachmentBodyLimit
    : IMPORT_PATHS.has(path)
      ? importBodyLimit
      : undefined;
const routeBodyLimit: MiddlewareHandler = (c, next) => {
  const limit = largeBodyLimit(c.req.path);
  if (!limit) return defaultBodyLimit(c, next);
  const { headers } = c.req.raw;
  return headers.has("content-length") && !headers.has("transfer-encoding")
    ? limit(c, next)
    : next();
};
const authenticatedBodyLimit: MiddlewareHandler = (c, next) => {
  const limit = largeBodyLimit(c.req.path);
  return limit ? limit(c, next) : next();
};

export function createApp(
  database: Kysely<DB>,
  {
    attachmentsDir = defaultAttachmentsDir,
    frontendUrl = "http://localhost:3000/",
    mail,
    contactEmail,
    captcha: captchaConfig = {
      secret: randomBytes(32).toString("hex"),
      cost: DEFAULT_CAPTCHA_COST,
    },
  }: {
    attachmentsDir?: string;
    frontendUrl?: string;
    mail?: { sendMail: SendMail; adminUrl: string; frontendUrl: string };
    contactEmail?: string;
    captcha?: CaptchaConfig;
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
  const captcha = createCaptcha(captchaConfig);
  const mapRateLimit = rateLimit(rateLimitConfig, "ip", MAP_IP_BUDGET);
  const mapPointsRateLimit = rateLimit(
    rateLimitConfig,
    "ip",
    MAP_POINTS_IP_BUDGET,
  );
  const publicSampleRoutes = new Hono<RateLimitEnv>()
    .use("*", (c, next) => {
      if (c.req.path.endsWith("/samples/map/points"))
        return mapPointsRateLimit(c, next);
      return c.req.path.endsWith("/samples/map/samples") ||
        (c.req.path.endsWith("/samples") &&
          bboxSchema.safeParse(c.req.query("viewport")).success)
        ? mapRateLimit(c, next)
        : publicRateLimit(c, next);
    })
    .use(
      "/:igsn/contact/*",
      rateLimit(rateLimitConfig, "ip", CONTACT_MAIL_IP_BUDGET),
    )
    .use("/:igsn/contact/*", captcha.middleware())
    .use("/export", rateLimit(rateLimitConfig, "ip", EXPORT_IP_BUDGET))
    .use("/:igsn/export", rateLimit(rateLimitConfig, "ip", EXPORT_IP_BUDGET))
    .route(
      "/",
      createSampleRoutes(
        sampleRepository,
        sampleAttachmentRepository,
        userSampleRepository,
        mail,
      ),
    );

  const contactRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip", CONTACT_MAIL_IP_BUDGET))
    .use("*", captcha.middleware())
    .route("/", createContactRoutes(mail, contactEmail));

  const captchaRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .get("/challenge", captcha.challengeHandler);

  const publicManualGroupRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .route("/", createPublicManualGroupRoutes(manualGroupRepository));

  const publicStatsRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .route("/", createStatsRoutes(createStatsRepository(database)));

  const publicUserRoutes = new Hono()
    .use("*", rateLimit(rateLimitConfig, "ip"))
    .route("/", createPublicUserRoutes(userRepository));

  const servicePublicRateLimit = rateLimit(rateLimitConfig, "ip");
  const serviceRoutes = new Hono<RateLimitEnv>()
    .use("*", (c, next) =>
      c.req.path.endsWith(SERVICE_MAP_PATH)
        ? mapRateLimit(c, next)
        : servicePublicRateLimit(c, next),
    )
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
    .use("*", rateLimit(rateLimitConfig, "ip", ADMIN_IP_BUDGET))
    .use("*", requireAuth)
    .use("*", adminRateLimit)
    .use("*", currentUser(userRepository))
    .use("*", authenticatedBodyLimit)
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
    .use("/samples/import-template/*", requirePublisher)
    .use("/samples/import/*", requirePublisher)
    .use("/samples/bulk-edit", requirePublisher)
    .route("/samples/import/uploads", createStagedUploadRoutes(tusServer))
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
      "/samples/series",
      createSampleSeriesRoutes(sampleRepository, userRepository),
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

  const rateLimitHeaders = [
    "Retry-After",
    "RateLimit-Limit",
    "RateLimit-Remaining",
    "RateLimit-Reset",
  ];
  const openCors = cors({ exposeHeaders: rateLimitHeaders });
  const appCors = cors({
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
      ...rateLimitHeaders,
      "X-Uncompressed-Length",
    ],
  });

  const app = new Hono<AuthenticatedEnv>()
    .use("*", (c, next) =>
      c.req.path.endsWith(SERVICE_MAP_PATH)
        ? openCors(c, next)
        : appCors(c, next),
    )
    .use("*", routeBodyLimit)
    .onError((error, c) => {
      if (error instanceof HTTPException) {
        return c.json({ error: error.message }, error.status);
      }
      console.error("unhandled api error", error);
      return c.json({ error: "Internal server error" }, 500);
    })
    .get("/", (c) => c.json({ message: "OK" }))
    .route("/samples", publicSampleRoutes)
    .route("/contact", contactRoutes)
    .route("/captcha", captchaRoutes)
    .route("/manual-groups", publicManualGroupRoutes)
    .route("/stats", publicStatsRoutes)
    .route("/users", publicUserRoutes)
    .route("/service", serviceRoutes)
    .route("/admin", adminRoutes);

  return { app };
}
