import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  ListSamplesResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";
import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import {
  samplePublishBlockers,
  toPublishableFields,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { managerScope } from "@projet-igsn/domain/user/moderation-scope";
import { Hono } from "hono";

import {
  type ServiceEnv,
  requireServiceAccount,
} from "../auth/require-service-account.ts";
import { hasUnattachable } from "../manual-group/has-unattachable.ts";
import { NOT_ATTACHABLE, PARENT_NOT_ELIGIBLE } from "../sample/admin-routes.ts";
import { findEligibleParent } from "../sample/find-eligible-parent.ts";
import { uploadLimit } from "../sample/upload-limit.ts";
import { validateCreateSampleBody } from "../sample/validator.ts";
import { validateListServiceSamplesQuery } from "./validator.ts";

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
    .post("/samples", validateCreateSampleBody, async (c) => {
      const account = c.get("serviceAccount");
      const input = c.req.valid("json");
      const [parentId] = input.parentIds ?? [];
      if (parentId !== undefined && input.location != null) {
        return c.json(
          { error: "A sub-sample inherits its parent's location" },
          400,
        );
      }
      const parent =
        parentId === undefined
          ? null
          : await findEligibleParent(
              samples,
              users,
              { id: account.owner.id, superAdmin: false },
              parentId,
            );
      if (parentId !== undefined && parent === null) {
        return c.json(PARENT_NOT_ELIGIBLE, 422);
      }
      const blockers = samplePublishBlockers(
        {
          ...toPublishableFields({
            ...input,
            location: parent?.location ?? input.location,
          }),
          attachments: [],
        },
        uploadLimit,
      );
      if (blockers.length > 0) {
        return c.json(
          { error: "Sample is not ready to publish", blockers },
          422,
        );
      }
      const submitted = input.manualGroupIds ?? [];
      if (submitted.length > 0) {
        const attachable = await manualGroups.listAttachableForUser(
          account.owner.id,
        );
        if (
          hasUnattachable(
            submitted,
            attachable.map((group) => group.id),
          )
        ) {
          return c.json(NOT_ATTACHABLE, 422);
        }
      }
      const body: SampleResponse = {
        data: await samples.createPublished(input, account.owner.id, account),
      };
      return c.json(body, 201);
    });
}
