import type { SampleAttachmentRepository } from "@projet-igsn/domain/sample/attachment/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  ListSamplesResponse,
  SampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { ListUsersResponse } from "@projet-igsn/domain/user/user-validator";

import { isSamplePublishable } from "@projet-igsn/domain/sample/publication/is-sample-publishable";
import { mergePublishedEdit } from "@projet-igsn/domain/sample/publication/published-field-lock";
import {
  samplePublishBlockers,
  toPublishableFields,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { Hono } from "hono";

import type { SampleAccessEnv } from "./require-sample-access.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { attachmentDownload } from "./attachment-download.ts";
import { requireSampleAccess } from "./require-sample-access.ts";
import { uploadLimit } from "./upload-limit.ts";
import {
  validateAddContributorBody,
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
  userSampleRepository: UserSampleRepository,
) {
  // Guards every route naming a sample id and hands it the sample it fetched:
  // present means the caller owns it (200), absent means no such sample (404),
  // and someone else's never reaches the route (403). Registered before those
  // routes below, since Hono runs handlers in registration order.
  const accessibleSample = requireSampleAccess(repository);

  return (
    new Hono<SampleAccessEnv>()
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
      .use("/:id", accessibleSample)
      .use("/:id/*", accessibleSample)
      .get("/:id", validateIdParam, (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Sample not found" }, 404);
        }
        const body: SampleResponse = { data: sample };
        return c.json(body);
      })
      .post("/", validateCreateSampleBody, async (c) => {
        const sample = await repository.create(
          c.req.valid("json"),
          c.get("user").id,
        );
        return c.json({ data: sample }, 201);
      })
      .get("/:id/contributors", validateIdParam, async (c) => {
        if (!c.get("sample")) {
          return c.json({ error: "Not found" }, 404);
        }
        if (c.get("role") !== "owner") {
          return c.json({ error: "Forbidden" }, 403);
        }
        const body: ListUsersResponse = {
          data: await userSampleRepository.listContributors(
            c.req.valid("param").id,
          ),
        };
        return c.json(body);
      })
      .post(
        "/:id/contributors",
        requireActiveSession,
        validateIdParam,
        validateAddContributorBody,
        async (c) => {
          if (!c.get("sample")) {
            return c.json({ error: "Not found" }, 404);
          }
          if (c.get("role") !== "owner") {
            return c.json({ error: "Forbidden" }, 403);
          }
          const added = await userSampleRepository.addContributor(
            c.req.valid("param").id,
            c.req.valid("json").userId,
          );
          if (added === "unknown_user") {
            return c.json({ error: "User not found" }, 404);
          }
          return c.body(null, 204);
        },
      )
      .put("/:id", validateIdParam, validateCreateSampleBody, async (c) => {
        const id = c.req.valid("param").id;
        const current = c.get("sample");
        if (!current) {
          return c.json({ error: "Not found" }, 404);
        }
        if (!canUpdateSample(c.get("role"), current)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const toPersist = current.published
          ? mergePublishedEdit(current, c.req.valid("json"))
          : c.req.valid("json");
        // A published sample must stay publishable, but only against blockers it
        // did not already have: reject an edit that INTRODUCES a new publish
        // blocker, while still letting an already-broken sample be edited on its
        // editable fields. The attachment count is capped by the body validator,
        // so both sides ignore it. Same get/write race note as publish below.
        if (current.published) {
          const existing = samplePublishBlockers(toPublishableFields(current));
          const after = samplePublishBlockers(toPublishableFields(toPersist));
          if (after.some((blocker) => !existing.includes(blocker))) {
            return c.json(
              { error: "Update would make the published sample unpublishable" },
              409,
            );
          }
        }
        // Attachment metadata rides the sample payload, reconciled wholesale
        // like links; the content itself was uploaded beforehand through the
        // attachment routes, so an unlisted attachment is deleted here.
        await attachmentsRepository.reconcile(id, toPersist.attachments ?? []);
        const sample = await repository.update(id, toPersist);
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        return c.json({ data: sample });
      })
      .post("/:id/publish", validateIdParam, async (c) => {
        const id = c.req.valid("param").id;
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        if (c.get("role") !== "owner") {
          return c.json({ error: "Forbidden" }, 403);
        }
        // A sample must be classified down to a publishable leaf material before
        // it can be published (see samplePublishBlockers). ponytail: the guard's
        // read and publish are separate transactions, so a concurrent change to
        // material in between is not guarded at the DB level (no CHECK on
        // material); acceptable for an admin-only action. Read and publish in one
        // txn if that race matters.
        if (!isSamplePublishable(sample, uploadLimit)) {
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
          const sample = c.get("sample");
          if (sample && !canUpdateSample(c.get("role"), sample)) {
            return c.json({ error: "Forbidden" }, 403);
          }
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
          if (created === "limit_reached") {
            return c.json({ error: "Attachment limit reached" }, 409);
          }
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
          const found = await attachmentsRepository.getContent(
            id,
            attachmentId,
          );
          if (!found) {
            return c.json({ error: "Attachment not found" }, 404);
          }
          return attachmentDownload(found.attachment, found.content);
        },
      )
      // Deletes one attachment on its own, without a sample update: the admin
      // frees a slot here before uploading the file that replaces it, so a swap
      // at the limit needs a single save.
      .delete(
        "/:id/attachments/:attachmentId",
        validateAttachmentParams,
        async (c) => {
          const sample = c.get("sample");
          if (sample && !canUpdateSample(c.get("role"), sample)) {
            return c.json({ error: "Forbidden" }, 403);
          }
          const { id, attachmentId } = c.req.valid("param");
          const removed = await attachmentsRepository.remove(id, attachmentId);
          if (!removed) {
            return c.json({ error: "Attachment not found" }, 404);
          }
          return c.body(null, 204);
        },
      )
  );
}
