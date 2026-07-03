import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { ListSamplesResponse } from "@projet-igsn/domain/sample/sample-validator";

import { Hono } from "hono";

import { requireAuth } from "../auth/middleware.ts";
import { validateCreateSampleBody, validateListQuery } from "./validator.ts";

export function createSampleRoutes(repository: SampleRepository) {
  return new Hono()
    .get("/", validateListQuery, async (c) => {
      const { page, perPage } = c.req.valid("query");
      const { data, total } = await repository.list({ page, perPage });
      const body: ListSamplesResponse = { data, meta: { total } };
      return c.json(body);
    })
    .post("/", requireAuth, validateCreateSampleBody, async (c) => {
      const sample = await repository.create(c.req.valid("json"));
      return c.json({ data: sample }, 201);
    });
}
