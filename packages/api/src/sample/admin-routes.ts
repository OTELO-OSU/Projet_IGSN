import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  ListSamplesResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";

import { isSamplePublishable } from "@projet-igsn/domain/sample/publication/is-sample-publishable";
import { updatePublishedSampleSchema } from "@projet-igsn/domain/sample/publication/update-published-sample-schema";
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
      const { page, perPage, sort, order, search } = c.req.valid("query");
      const { data, total } = await repository.list({
        page,
        perPage,
        sort,
        order,
        search,
      });
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
      const id = c.req.valid("param").id;
      const current = await repository.get(id);
      if (!current) {
        return c.json({ error: "Not found" }, 404);
      }
      // A published sample must stay publishable: reject an update that strips
      // a publish requirement (e.g. clears the collection date). Drafts keep
      // the looser create schema. Same get/write race note as publish below.
      if (
        current.published &&
        !updatePublishedSampleSchema.safeParse(c.req.valid("json")).success
      ) {
        return c.json(
          { error: "Update would make the published sample unpublishable" },
          409,
        );
      }
      const sample = await repository.update(id, c.req.valid("json"));
      if (!sample) {
        return c.json({ error: "Not found" }, 404);
      }
      return c.json({ data: sample });
    })
    .post("/:id/publish", validateIdParam, async (c) => {
      const id = c.req.valid("param").id;
      const sample = await repository.get(id);
      if (!sample) {
        return c.json({ error: "Not found" }, 404);
      }
      // A sample must be classified down to a publishable leaf material before
      // it can be published (see samplePublishBlockers). ponytail: get and
      // publish are separate transactions, so a concurrent change to material in
      // between is not guarded at the DB level (no CHECK on material); acceptable
      // for an admin-only action. Wrap get+publish in one txn if that race matters.
      if (!isSamplePublishable(sample)) {
        return c.json({ error: "Sample is not ready to publish" }, 409);
      }
      const published = await repository.publish(id);
      return c.json({ data: published });
    });
}
