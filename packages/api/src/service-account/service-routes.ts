import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleBatchRepository } from "@projet-igsn/domain/sample-batch/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";

import { OpenAPIHono } from "@hono/zod-openapi";

import type { SendMail } from "../mail/send-mail.ts";

import {
  type ServiceEnv,
  requireServiceAccount,
} from "../auth/require-service-account.ts";
import { registerGroupRoutes } from "./group-routes.ts";
import { registerSampleBatchRoutes } from "./sample-batch-routes.ts";
import { registerServiceDocsRoutes } from "./service-docs-routes.ts";
import { registerServiceReadRoutes } from "./service-read-routes.ts";
import { serviceValidationHook } from "./service-validation-hook.ts";
import { registerServiceWriteRoutes } from "./service-write-routes.ts";
import { registerVocabularyRoutes } from "./vocabulary-routes.ts";

export function createServiceRoutes(
  serviceAccounts: Pick<ServiceAccountRepository, "findByApiKeyHash">,
  samples: SampleRepository,
  manualGroups: Pick<
    ManualGroupRepository,
    "listAttachableForUser" | "listWithPublishedSample"
  >,
  frontendUrl: string,
  userSamples: Pick<UserSampleRepository, "listCollaborators">,
  sampleBatches: SampleBatchRepository,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  const checks = { samples, manualGroups };
  const app = new OpenAPIHono<ServiceEnv>({
    defaultHook: serviceValidationHook,
  });
  registerServiceDocsRoutes(app, frontendUrl);
  app.use("*", requireServiceAccount(serviceAccounts));
  registerVocabularyRoutes(app);
  registerGroupRoutes(app, manualGroups);
  registerSampleBatchRoutes(app, { ...checks, sampleBatches });
  registerServiceReadRoutes(app, samples, frontendUrl);
  registerServiceWriteRoutes(app, checks, frontendUrl, userSamples, mail);
  return app;
}
