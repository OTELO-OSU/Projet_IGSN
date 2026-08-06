import type { SampleAttachmentRepository } from "@projet-igsn/domain/sample/attachment/repository";
import type {
  SampleEditLockResponse,
  SampleLocked,
} from "@projet-igsn/domain/sample/edit-lock";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  AdminListSamplesResponse,
  AdminSampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { SampleCollaboratorsResponse } from "@projet-igsn/domain/user-sample/user-sample-validator";

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
import { requireEditLock } from "./require-edit-lock.ts";
import { requireSampleAccess } from "./require-sample-access.ts";
import { uploadLimit } from "./upload-limit.ts";
import {
  validateAddContributorBody,
  validateAttachmentParams,
  validateAttachmentUpload,
  validateCreateSampleBody,
  validateIdParam,
  validateListQuery,
  validateUpdateSampleBody,
} from "./validator.ts";

// Authentication is enforced once by the requireAuth guard on the /admin mount
// (see app.ts), so no per-route authentication guard here.
export function createSampleAdminRoutes(
  repository: SampleRepository,
  attachmentsRepository: SampleAttachmentRepository,
  userSampleRepository: UserSampleRepository,
) {
  // Registered before those routes below, since Hono runs handlers in
  // registration order.
  const accessibleSample = requireSampleAccess(repository);
  // Mounted on the writes only, never on the /lock routes below: claiming or
  // releasing a lock must work whoever holds it.
  const unlockedSample = requireEditLock(repository);

  return (
    new Hono<SampleAccessEnv>()
      .get("/", validateListQuery, async (c) => {
        const { page, perPage, sort, order, search, ageMin, ageMax, ageUnit } =
          c.req.valid("query");
        const user = c.get("user");
        const query = {
          page,
          perPage,
          sort,
          order,
          search,
          ageMin,
          ageMax,
          ageUnit,
        };
        const { data, total } = user.superAdmin
          ? await repository.listAllAsSuperAdmin(query)
          : await repository.listAssignedTo(query, user.id);
        const body: AdminListSamplesResponse = { data, meta: { total } };
        return c.json(body);
      })
      .use("/:id", accessibleSample)
      .use("/:id/*", accessibleSample)
      .get("/:id", validateIdParam, (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Sample not found" }, 404);
        }
        const body: AdminSampleResponse = {
          data: sample,
          role: c.get("role")!,
        };
        return c.json(body);
      })
      .post("/", validateCreateSampleBody, async (c) => {
        const sample = await repository.create(
          c.req.valid("json"),
          c.get("user").id,
        );
        return c.json({ data: sample }, 201);
      })
      .get("/:id/collaborators", validateIdParam, async (c) => {
        if (!c.get("sample")) {
          return c.json({ error: "Not found" }, 404);
        }
        if (c.get("role") !== "owner") {
          return c.json({ error: "Forbidden" }, 403);
        }
        const body: SampleCollaboratorsResponse = {
          data: await userSampleRepository.listCollaborators(
            c.req.valid("param").id,
          ),
        };
        return c.json(body);
      })
      .post(
        "/:id/collaborators",
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
      // The edit page calls it on open and on a timer, so it must be
      // idempotent.
      .put("/:id/lock", validateIdParam, async (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        if (!canUpdateSample(c.get("role"), sample)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const user = c.get("user");
        const lock = await repository.acquireEditLock(
          c.req.valid("param").id,
          user.id,
        );
        if (!lock) {
          return c.json({ error: "Not found" }, 404);
        }
        if (lock.userId !== user.id) {
          const locked: SampleLocked = {
            error: "Sample is being edited by another collaborator",
            reason: "locked",
            lock,
          };
          return c.json(locked, 409);
        }
        const body: SampleEditLockResponse = { lock };
        return c.json(body);
      })
      .delete("/:id/lock", validateIdParam, async (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        if (!canUpdateSample(c.get("role"), sample)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        await repository.releaseEditLock(
          c.req.valid("param").id,
          c.get("user").id,
        );
        return c.body(null, 204);
      })
      .put(
        "/:id",
        validateIdParam,
        unlockedSample,
        validateUpdateSampleBody,
        async (c) => {
          const id = c.req.valid("param").id;
          const current = c.get("sample");
          if (!current) {
            return c.json({ error: "Not found" }, 404);
          }
          if (!canUpdateSample(c.get("role"), current)) {
            return c.json({ error: "Forbidden" }, 403);
          }
          const { expectedUpdatedAt, ...input } = c.req.valid("json");
          // Compared in JS, never as a `where updated_at = ?` predicate: the
          // column is timestamptz(6) fed by now(), while the value that
          // round-tripped through the client lost its microseconds to a JS Date,
          // so a SQL equality would match zero rows and 409 every save. Both
          // sides here came through postgres-js, which truncates to ms.
          // Before the reconcile below: a rejected save must not have already
          // deleted attachments.
          // ponytail: this read and the write are not one transaction, so a
          // few-ms window remains, the same race already accepted for publish
          // below. The edit lock closes it in practice.
          if (expectedUpdatedAt.getTime() !== current.updatedAt.getTime()) {
            return c.json(
              { error: "Sample changed since it was loaded", reason: "stale" },
              409,
            );
          }
          const toPersist = current.published
            ? mergePublishedEdit(current, input)
            : input;
          // The attachment count is capped by the body validator, so both sides
          // ignore it.
          if (current.published) {
            const existing = samplePublishBlockers(
              toPublishableFields(current),
            );
            const after = samplePublishBlockers(toPublishableFields(toPersist));
            if (after.some((blocker) => !existing.includes(blocker))) {
              return c.json(
                {
                  error: "Update would make the published sample unpublishable",
                  reason: "unpublishable",
                },
                409,
              );
            }
          }
          // The content itself was uploaded beforehand through the attachment
          // routes, so an unlisted attachment is deleted here.
          await attachmentsRepository.reconcile(
            id,
            toPersist.attachments ?? [],
          );
          const sample = await repository.update(id, toPersist);
          if (!sample) {
            return c.json({ error: "Not found" }, 404);
          }
          return c.json({ data: sample });
        },
      )
      .post("/:id/publish", validateIdParam, unlockedSample, async (c) => {
        const id = c.req.valid("param").id;
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        if (c.get("role") !== "owner") {
          return c.json({ error: "Forbidden" }, 403);
        }
        // ponytail: the guard's read and publish are separate transactions, so a
        // concurrent change to material in between is not guarded at the DB level
        // (no CHECK on material); acceptable for an admin-only action. Read and
        // publish in one txn if that race matters.
        if (!isSamplePublishable(sample, uploadLimit, c.get("user"))) {
          return c.json({ error: "Sample is not ready to publish" }, 409);
        }
        const published = await repository.publish(id);
        return c.json({ data: published });
      })
      .post(
        "/:id/attachments",
        validateIdParam,
        unlockedSample,
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
      // The admin frees a slot here before uploading the file that replaces
      // it, so a swap at the limit needs a single save.
      .delete(
        "/:id/attachments/:attachmentId",
        validateAttachmentParams,
        unlockedSample,
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
