import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { ListSamplesResponse } from "@projet-igsn/domain/sample/sample-validator";
import type { ServiceAccountRepository } from "@projet-igsn/domain/service-account/repository";

import { managerScope } from "@projet-igsn/domain/user/moderation-scope";
import { Hono } from "hono";

import {
  type ServiceEnv,
  requireServiceAccount,
} from "../auth/require-service-account.ts";
import { validateListServiceSamplesQuery } from "./validator.ts";

export function createServiceRoutes(
  serviceAccounts: Pick<ServiceAccountRepository, "findByApiKeyHash">,
  samples: Pick<SampleRepository, "listModerated">,
) {
  return new Hono<ServiceEnv>()
    .use("*", requireServiceAccount(serviceAccounts))
    .get("/samples", validateListServiceSamplesQuery, async (c) => {
      const account = c.get("serviceAccount");
      const { data, total } = await samples.listModerated(
        { ...c.req.valid("query"), status: "published", sort: "igsn" },
        managerScope(account.id, account.managedGroups),
      );
      const body: ListSamplesResponse = {
        data: data.map(({ owner, ...sample }) => ({
          ...sample,
          owner: owner && { name: owner.name, firstname: owner.firstname },
        })),
        meta: { total },
      };
      return c.json(body);
    });
}
