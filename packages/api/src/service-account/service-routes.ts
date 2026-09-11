import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  ListSamplesResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";
import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type { InvalidServiceSample } from "@projet-igsn/domain/service-account/service-sample-validator";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { managerScope } from "@projet-igsn/domain/user/moderation-scope";
import { Hono } from "hono";

import {
  type ServiceEnv,
  requireServiceAccount,
} from "../auth/require-service-account.ts";
import { createServiceSampleIssues } from "./create-service-sample-issues.ts";
import {
  validateCreateServiceSampleBody,
  validateListServiceSamplesQuery,
} from "./validator.ts";

export function createServiceRoutes(
  serviceAccounts: Pick<ServiceAccountRepository, "findByApiKeyHash">,
  samples: SampleRepository,
  manualGroups: Pick<ManualGroupRepository, "listAttachableForUser">,
  users: UserRepository,
) {
  return new Hono<ServiceEnv>()
    .use("*", requireServiceAccount(serviceAccounts))
    .get("/samples", validateListServiceSamplesQuery, async (c) => {
      const account = c.get("serviceAccount");
      const { editable, ...query } = c.req.valid("query");
      const { data, total } = await samples.listPublishedForService(
        { ...query, sort: "igsn" },
        managerScope(account.id, account.managedGroups),
        editable === true,
      );
      const body: ListSamplesResponse = { data, meta: { total } };
      return c.json(body);
    })
    .post("/samples", validateCreateServiceSampleBody, async (c) => {
      const account = c.get("serviceAccount");
      const input = c.req.valid("json");
      const issues = await createServiceSampleIssues(
        { samples, users, manualGroups },
        { id: account.owner.id, superAdmin: false },
        input,
      );
      if (issues.length > 0) {
        const body: InvalidServiceSample = { error: "Invalid sample", issues };
        return c.json(body, 422);
      }
      const body: SampleResponse = {
        data: await samples.createPublished(input, account.owner.id, account),
      };
      return c.json(body, 201);
    });
}
