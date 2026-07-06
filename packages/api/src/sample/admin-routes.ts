import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  ListSamplesResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";

import { Hono } from "hono";

import {
  validateCreateSampleBody,
  validateIdParam,
  validateListQuery,
} from "./validator.ts";

// Full sample CRUD for the admin app. Authentication is enforced once by the
// requireAuth guard on the /admin mount (see app.ts), so no per-route guard here.
export function createSampleAdminRoutes(repository: SampleRepository) {
  return new Hono()
    .get("/", validateListQuery, async (c) => {
      const { page, perPage } = c.req.valid("query");
      const { data, total } = await repository.list({ page, perPage });
      const body: ListSamplesResponse = { data, meta: { total } };
      return c.json(body);
    })
    .get("/:id", validateIdParam, async (c) => {
      const sample = await repository.get(c.req.valid("param").id);
      if (!sample) {
        return c.json({ error: "Sample not found" }, 404);
      }
      const body: SampleResponse = { data: sample };
      return c.json(body);
    })
    .post("/", validateCreateSampleBody, async (c) => {
      const sample = await repository.create(c.req.valid("json"));
      return c.json({ data: sample }, 201);
    })
    .put("/:id", validateIdParam, validateCreateSampleBody, async (c) => {
      const sample = await repository.update(
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      if (!sample) {
        return c.json({ error: "Not found" }, 404);
      }
      return c.json({ data: sample });
    })
    .post("/:id/publish", validateIdParam, async (c) => {
      const sample = await repository.publish(c.req.valid("param").id);
      if (!sample) {
        return c.json({ error: "Not found" }, 404);
      }
      return c.json({ data: sample });
    });
}
