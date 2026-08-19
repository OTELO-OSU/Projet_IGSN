import type { ManualGroupsResponse } from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";

import { Hono } from "hono";

// ponytail: unpaginated, the list is bounded by the number of curated groups; page it if that number ever grows.
export function createPublicManualGroupRoutes(
  repository: ManualGroupRepository,
) {
  return new Hono().get("/", async (c) => {
    const body: ManualGroupsResponse = {
      data: await repository.listWithPublishedSample(),
    };
    return c.json(body);
  });
}
