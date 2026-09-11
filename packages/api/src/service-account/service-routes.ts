import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  ListSamplesResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";
import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type {
  FrozenServiceSample,
  InvalidServiceSample,
} from "@projet-igsn/domain/service-account/service-sample-validator";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { frozenFieldEdits } from "@projet-igsn/domain/sample/publication/frozen-field-edits";
import { PUBLISH_BLOCKER_PATH } from "@projet-igsn/domain/sample/publication/publish-blocker-path";
import { managerScope } from "@projet-igsn/domain/user/moderation-scope";
import { Hono } from "hono";

import {
  type ServiceEnv,
  requireServiceAccount,
} from "../auth/require-service-account.ts";
import { newPublishBlockers } from "../sample/new-publish-blockers.ts";
import { validateIgsnParam } from "../sample/validator.ts";
import { createServiceSampleIssues } from "./create-service-sample-issues.ts";
import { serviceSampleIssue } from "./service-sample-issue.ts";
import {
  validateCreateServiceSampleBody,
  validateListServiceSamplesQuery,
  validateUpdateServiceSampleBody,
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
        account.owner.id,
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
    })
    .put(
      "/samples/:igsn",
      validateIgsnParam,
      validateUpdateServiceSampleBody,
      async (c) => {
        const account = c.get("serviceAccount");
        const current = await samples.getPublicByIgsn(
          c.req.valid("param").igsn,
        );
        if (!current || current.status !== "published") {
          return c.json({ error: "Not found" }, 404);
        }
        if (
          !(await samples.isModerated(
            current.id,
            managerScope(account.id, account.managedGroups),
          ))
        ) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const input = c.req.valid("json");
        const frozen = frozenFieldEdits(current, input);
        if (frozen.length > 0) {
          const body: FrozenServiceSample = {
            error: "Forbidden",
            issues: frozen.map((path) =>
              serviceSampleIssue("field_frozen", [path]),
            ),
          };
          return c.json(body, 403);
        }
        const blockers = newPublishBlockers(current, input);
        if (blockers.length > 0) {
          const body: InvalidServiceSample = {
            error: "Invalid sample",
            issues: blockers.map((blocker) =>
              serviceSampleIssue(blocker, PUBLISH_BLOCKER_PATH[blocker]),
            ),
          };
          return c.json(body, 422);
        }
        const data = await samples.update(current.id, input);
        if (!data) {
          return c.json({ error: "Not found" }, 404);
        }
        const body: SampleResponse = { data };
        return c.json(body);
      },
    );
}
