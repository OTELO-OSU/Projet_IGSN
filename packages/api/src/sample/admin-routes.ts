import type { SampleAttachmentRepository } from "@projet-igsn/domain/sample/attachment/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  ListSamplesResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";

import { isSamplePublishable } from "@projet-igsn/domain/sample/publication/is-sample-publishable";
import { publishedSampleSchema } from "@projet-igsn/domain/sample/publication/published-sample-schema";
import { Hono } from "hono";

import type { AuthenticatedEnv } from "../auth/current-user.ts";

import { attachmentDownload } from "./attachment-download.ts";
import { requireSampleOwner } from "./require-sample-owner.ts";
import {
  validateAttachmentParams,
  validateAttachmentUpload,
  validateCreateSampleBody,
  validateIdParam,
  validateListQuery,
} from "./validator.ts";

// Full sample CRUD for the admin app. Authentication is enforced once by the
// requireAuth guard on the /admin mount (see app.ts), which also resolves the
// caller with currentUser, so no per-route authentication guard here.
// Authorization is per sample: a user only reaches their own (ADR 0019), through
// the owner-scoped list and the requireSampleOwner guard below.
export function createSampleAdminRoutes(
  repository: SampleRepository,
  attachmentsRepository: SampleAttachmentRepository,
) {
  // Guards every route naming a sample id. Registered before them below, since
  // Hono runs handlers in registration order.
  const ownedSample = requireSampleOwner(repository);

  return new Hono<AuthenticatedEnv>()
    .get("/", validateListQuery, async (c) => {
      const { page, perPage, sort, order, search, ageMin, ageMax, ageUnit } =
        c.req.valid("query");
      const { data, total } = await repository.list(
        {
          page,
          perPage,
          sort,
          order,
          search,
          ageMin,
          ageMax,
          ageUnit,
        },
        c.get("user").id,
      );
      const body: ListSamplesResponse = { data, meta: { total } };
      return c.json(body);
    })
    .use("/:id", ownedSample)
    .use("/:id/*", ownedSample)
    .get("/:id", validateIdParam, async (c) => {
      const sample = await repository.get(c.req.valid("param").id);
      if (!sample) {
        return c.json({ error: "Sample not found" }, 404);
      }
      const body: SampleResponse = { data: sample };
      return c.json(body);
    })
    .post("/", validateCreateSampleBody, async (c) => {
      // The creator owns the sample.
      const sample = await repository.create(
        c.req.valid("json"),
        c.get("user").id,
      );
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
        !publishedSampleSchema.safeParse(c.req.valid("json")).success
      ) {
        return c.json(
          { error: "Update would make the published sample unpublishable" },
          409,
        );
      }
      // Attachment metadata rides the sample payload, reconciled wholesale
      // like links; the content itself was uploaded beforehand through the
      // attachment routes, so an unlisted attachment is deleted here.
      await attachmentsRepository.reconcile(
        id,
        c.req.valid("json").attachments ?? [],
      );
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
    })
    .post(
      "/:id/attachments",
      validateIdParam,
      validateAttachmentUpload,
      async (c) => {
        const { file, description } = c.req.valid("form");
        const created = await attachmentsRepository.create(
          c.req.valid("param").id,
          {
            name: file.name,
            // The client may omit the type; store a neutral one over "".
            mediaType: file.type || "application/octet-stream",
            description: description ?? null,
          },
          new Uint8Array(await file.arrayBuffer()),
        );
        if (!created) {
          return c.json({ error: "Sample not found" }, 404);
        }
        return c.json({ data: created }, 201);
      },
    )
    .get(
      "/:id/attachments/:attachmentId",
      validateAttachmentParams,
      async (c) => {
        const { id, attachmentId } = c.req.valid("param");
        const found = await attachmentsRepository.getContent(id, attachmentId);
        if (!found) {
          return c.json({ error: "Attachment not found" }, 404);
        }
        return attachmentDownload(found.attachment, found.content);
      },
    );
}
