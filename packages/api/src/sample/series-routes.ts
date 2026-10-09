import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { EligibleParentsResponse } from "@projet-igsn/domain/sample/sample-validator";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { getModerationScope } from "../auth/moderation-scope.ts";
import { validateSearchEligibleParentsQuery } from "./validator.ts";

export function createSampleSeriesRoutes(
  repository: SampleRepository,
  users: UserRepository,
) {
  return new Hono<AuthenticatedEnv>().get(
    "/",
    validateSearchEligibleParentsQuery,
    async (c) => {
      const user = c.get("user");
      const body: EligibleParentsResponse = {
        data: await repository.searchEligibleSeries(
          c.req.valid("query"),
          user.id,
          await getModerationScope(users, user),
        ),
      };
      return c.json(body);
    },
  );
}
