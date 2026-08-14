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

import { mergePublishedEdit } from "@projet-igsn/domain/sample/publication/published-field-lock";
import {
  samplePublishBlockers,
  toPublishableFields,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { canGrantRole } from "@projet-igsn/domain/user-sample/can-grant-role";
import { canManageCollaborators } from "@projet-igsn/domain/user-sample/can-manage-collaborators";
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";
import { Hono } from "hono";

import type { SendMail } from "../mail/send-mail.ts";
import type { SampleAccessEnv } from "./require-sample-access.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { sendSampleInvitationMail } from "../user-sample/send-sample-invitation-mail.ts";
import { attachmentDownload } from "./attachment-download.ts";
import { requireEditLock } from "./require-edit-lock.ts";
import { requireSampleAccess } from "./require-sample-access.ts";
import { uploadLimit } from "./upload-limit.ts";
import {
  validateAddCollaboratorBody,
  validateAttachmentParams,
  validateAttachmentUpload,
  validateCollaboratorParams,
  validateCreateSampleBody,
  validateIdParam,
  validateListQuery,
  validateUpdateSampleBody,
} from "./validator.ts";

export function createSampleAdminRoutes(
  repository: SampleRepository,
  attachmentsRepository: SampleAttachmentRepository,
  userSampleRepository: UserSampleRepository,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  const accessibleSample = requireSampleAccess(repository);
  const unlockedSample = requireEditLock(repository);

  return new Hono<SampleAccessEnv>()
    .get("/", validateListQuery, async (c) => {
      const {
        page,
        perPage,
        sort,
        order,
        search,
        ownership,
        ageMin,
        ageMax,
        ageUnit,
      } = c.req.valid("query");
      const user = c.get("user");
      const query = {
        page,
        perPage,
        sort,
        order,
        search,
        ownership,
        ageMin,
        ageMax,
        ageUnit,
      };
      const { data, total } =
        user.superAdmin && ownership === undefined
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
        c.get("user"),
      );
      return c.json({ data: sample }, 201);
    })
    .get("/:id/collaborators", validateIdParam, async (c) => {
      if (!c.get("sample")) {
        return c.json({ error: "Not found" }, 404);
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
      validateAddCollaboratorBody,
      async (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        const id = c.req.valid("param").id;
        const { userId, role } = c.req.valid("json");
        if (!canGrantRole(c.get("role"), role)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const added = await userSampleRepository.addCollaborator(
          id,
          userId,
          role,
          { mayChangeRole: canManageCollaborators(c.get("role")) },
        );
        if (added === "unknown_user") {
          return c.json({ error: "User not found" }, 404);
        }
        if (added === "role_change_forbidden") {
          return c.json({ error: "Forbidden" }, 403);
        }
        if (mail && added !== "already_collaborator") {
          // ponytail: fire and forget; a retry queue if a lost invitation ever matters.
          void sendSampleInvitationMail(
            {
              invitee: added.added,
              inviter: c.get("user"),
              role,
              sampleName: sample.name,
              sampleUrl: new URL(`/samples/${id}`, mail.adminUrl).toString(),
            },
            mail.sendMail,
          );
        }
        return c.body(null, 204);
      },
    )
    .delete(
      "/:id/collaborators/:userId",
      requireActiveSession,
      validateCollaboratorParams,
      async (c) => {
        if (!c.get("sample")) {
          return c.json({ error: "Not found" }, 404);
        }
        if (!canManageCollaborators(c.get("role"))) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const { id, userId } = c.req.valid("param");
        const removed = await userSampleRepository.removeCollaborator(
          id,
          userId,
        );
        if (removed === "not_found") {
          return c.json({ error: "Collaborator not found" }, 404);
        }
        return c.body(null, 204);
      },
    )
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
        // ponytail: this read and the write are not one transaction, so a
        // few-ms window remains.
        if (expectedUpdatedAt.getTime() !== current.updatedAt.getTime()) {
          return c.json(
            { error: "Sample changed since it was loaded", reason: "stale" },
            409,
          );
        }
        const toPersist = current.published
          ? mergePublishedEdit(current, input)
          : input;
        if (current.published) {
          const existing = samplePublishBlockers(toPublishableFields(current));
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
        await attachmentsRepository.reconcile(id, toPersist.attachments ?? []);
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
      if (!isSampleEditor(c.get("role"))) {
        return c.json({ error: "Forbidden" }, 403);
      }
      // ponytail: the guard's read and publish are separate transactions, so a
      // concurrent change to material in between is not guarded at the DB
      // level. Read and publish in one txn if that race matters.
      if (
        samplePublishBlockers(sample, uploadLimit, c.get("user")).length > 0
      ) {
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
        const found = await attachmentsRepository.getContent(id, attachmentId);
        if (!found) {
          return c.json({ error: "Attachment not found" }, 404);
        }
        return attachmentDownload(found.attachment, found.content);
      },
    )
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
    );
}
