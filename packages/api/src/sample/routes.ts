import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  ListSamplesResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";

import { Hono } from "hono";

import { validateIgsnParam, validateListQuery } from "./validator.ts";

// Public, unauthenticated reads for the frontend: published samples only, looked
// up by IGSN. Writes and admin reads (all samples, by id) live in admin-routes.ts
// under the authenticated /admin mount.
export function createSampleRoutes(repository: SampleRepository) {
  return new Hono()
    .get("/", validateListQuery, async (c) => {
      const { page, perPage } = c.req.valid("query");
      const { data, total } = await repository.listPublished({ page, perPage });
      const body: ListSamplesResponse = { data, meta: { total } };
      return c.json(body);
    })
    .get("/:igsn", validateIgsnParam, async (c) => {
      const sample = await repository.getPublishedByIgsn(
        c.req.valid("param").igsn,
      );
      if (!sample) {
        return c.json({ error: "Sample not found" }, 404);
      }
      const body: SampleResponse = { data: sample };
      return c.json(body);
    });
}
