import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  EligibleParentsResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { getModerationScope } from "../auth/moderation-scope.ts";
import { findEligibleParent } from "./find-eligible-parent.ts";
import {
  validateIdParam,
  validateSearchEligibleParentsQuery,
} from "./validator.ts";

export function createSampleParentRoutes(
  repository: SampleRepository,
  users: UserRepository,
) {
  return new Hono<AuthenticatedEnv>()
    .get("/", validateSearchEligibleParentsQuery, async (c) => {
      const user = c.get("user");
      const body: EligibleParentsResponse = {
        data: await repository.searchEligibleParents(
          c.req.valid("query"),
          user.id,
          await getModerationScope(users, user),
        ),
      };
      return c.json(body);
    })
    .get("/:id", validateIdParam, async (c) => {
      const sample = await findEligibleParent(
        repository,
        users,
        c.get("user"),
        c.req.valid("param").id,
      );
      if (!sample) {
        return c.json({ error: "Sample not found" }, 404);
      }
      const body: SampleResponse = { data: sample };
      return c.json(body);
    });
}
