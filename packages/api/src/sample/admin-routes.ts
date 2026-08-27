import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleAttachmentRepository } from "@projet-igsn/domain/sample/attachment/repository";
import type {
  SampleEditLockResponse,
  SampleLocked,
} from "@projet-igsn/domain/sample/edit-lock";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type {
  AdminListSamplesResponse,
  AdminSampleResponse,
  ListSamplesQuery,
} from "@projet-igsn/domain/sample/sample-validator";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { SampleCollaboratorsResponse } from "@projet-igsn/domain/user-sample/user-sample-validator";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { changedSampleFields } from "@projet-igsn/domain/sample/changed-sample-fields";
import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { mergePublishedEdit } from "@projet-igsn/domain/sample/publication/published-field-lock";
import {
  samplePublishBlockers,
  toPublishableFields,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { canGrantRole } from "@projet-igsn/domain/user-sample/can-grant-role";
import { canManageCollaborators } from "@projet-igsn/domain/user-sample/can-manage-collaborators";
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";
import { isSampleOwner } from "@projet-igsn/domain/user-sample/is-sample-owner";
import { Hono } from "hono";

import type { ModerationEnv } from "../auth/require-user-moderation.ts";
import type { SendMail } from "../mail/send-mail.ts";
import type { SampleAccessEnv } from "./require-sample-access.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireUserModeration } from "../auth/require-user-moderation.ts";
import { trySendMail } from "../mail/try-send-mail.ts";
import { sampleInvitationMail } from "../user-sample/sample-invitation-mail.ts";
import { attachmentDownload } from "./attachment-download.ts";
import { notifySampleModerated } from "./notify-sample-moderated.ts";
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
  validateStatusBody,
  validateUpdateSampleBody,
} from "./validator.ts";

const NOT_ATTACHABLE = {
  error: "Manual group not attachable to this sample",
} as const;

function sameGroupIds(submitted: string[], stored: string[]) {
  const asked = new Set(submitted);
  return asked.size === stored.length && stored.every((id) => asked.has(id));
}

function hasUnattachable(submitted: string[], allowed: string[]) {
  const attachable = new Set(allowed);
  return submitted.some((id) => !attachable.has(id));
}

function adminListQuery({
  institutionalOrganization: _organization,
  institutionalOsu: _osu,
  institutionalLaboratory: _laboratory,
  bbox: _bbox,
  ...rest
}: ListSamplesQuery): ListSamplesQuery {
  return rest;
}

type SampleAdminEnv = {
  Variables: SampleAccessEnv["Variables"] & ModerationEnv["Variables"];
};

export function createSampleAdminRoutes(
  repository: SampleRepository,
  attachmentsRepository: SampleAttachmentRepository,
  userSampleRepository: UserSampleRepository,
  manualGroups: ManualGroupRepository,
  users: UserRepository,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  const accessibleSample = requireSampleAccess(repository, users);
  const unlockedSample = requireEditLock(repository);

  return new Hono<SampleAdminEnv>()
    .get("/", validateListQuery, async (c) => {
      const { data, total } = await repository.listAssignedTo(
        adminListQuery(c.req.valid("query")),
        c.get("user").id,
      );
      const body: AdminListSamplesResponse = { data, meta: { total } };
      return c.json(body);
    })
    .get(
      "/moderated",
      requireUserModeration(users),
      validateListQuery,
      async (c) => {
        const { data, total } = await repository.listModerated(
          { ...adminListQuery(c.req.valid("query")), ownership: undefined },
          c.get("scope"),
        );
        const body: AdminListSamplesResponse = { data, meta: { total } };
        return c.json(body);
      },
    )
    .use("/:id", accessibleSample)
    .use("/:id/*", accessibleSample)
    .get("/:id", validateIdParam, async (c) => {
      const sample = c.get("sample");
      if (!sample) {
        return c.json({ error: "Sample not found" }, 404);
      }
      const body: AdminSampleResponse = {
        data: sample,
        role: c.get("role")!,
        manualGroupOptions: isSampleOwner(c.get("role"))
          ? await manualGroups.listForSampleOwner(sample.id)
          : [],
      };
      return c.json(body);
    })
    .post("/", validateCreateSampleBody, async (c) => {
      const input = c.req.valid("json");
      const user = c.get("user");
      const submitted = input.manualGroupIds ?? [];
      if (submitted.length > 0) {
        const attachable = await manualGroups.listForUser(user.id);
        if (
          hasUnattachable(
            submitted,
            attachable.map((group) => group.id),
          )
        ) {
          return c.json(NOT_ATTACHABLE, 422);
        }
      }
      const sample = await repository.create(input, user);
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
        if (!canGrantRole(c.get("shareRole"), role)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const added = await userSampleRepository.addCollaborator(
          id,
          userId,
          role,
          { mayChangeRole: canManageCollaborators(c.get("shareRole")) },
        );
        if (mail && added !== "already_collaborator") {
          // ponytail: fire and forget; a retry queue if a lost invitation ever matters.
          void trySendMail(
            added.added.email,
            () =>
              sampleInvitationMail({
                invitee: added.added,
                inviter: c.get("user"),
                role,
                sampleName: sample.name,
                sampleUrl: new URL(`/samples/${id}`, mail.adminUrl).toString(),
              }),
            mail.sendMail,
            "Could not mail the sample invitation",
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
        if (!canManageCollaborators(c.get("shareRole"))) {
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
        // ponytail: this read and the write are not one transaction.
        if (expectedUpdatedAt.getTime() !== current.updatedAt.getTime()) {
          return c.json(
            { error: "Sample changed since it was loaded", reason: "stale" },
            409,
          );
        }
        const wasPublished = hasPermanentIgsn(current);
        const toPersist = wasPublished
          ? mergePublishedEdit(current, input)
          : input;
        if (wasPublished) {
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
        const stored = current.manualGroups.map((group) => group.id);
        const submitted = toPersist.manualGroupIds ?? stored;
        if (!sameGroupIds(submitted, stored)) {
          if (!isSampleOwner(c.get("role"))) {
            return c.json({ error: "Forbidden" }, 403);
          }
          const attachable = await manualGroups.listForSampleOwner(id);
          if (
            hasUnattachable(submitted, [
              ...attachable.map((group) => group.id),
              ...stored,
            ])
          ) {
            return c.json(NOT_ATTACHABLE, 422);
          }
        }
        await attachmentsRepository.reconcile(id, toPersist.attachments ?? []);
        const sample = await repository.update(id, toPersist);
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        if (mail && c.get("moderating")) {
          const fields = changedSampleFields(current, toPersist);
          if (fields.length > 0) {
            // ponytail: fire and forget; a retry queue if a lost notification ever matters.
            void notifySampleModerated({
              userSamples: userSampleRepository,
              mail,
              sample,
              fields,
            });
          }
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
      if (hasPermanentIgsn(sample)) {
        return c.json({ error: "Sample is already published" }, 409);
      }
      // ponytail: the guard's read and publish are separate transactions. Read and publish in one txn if that race matters.
      if (
        samplePublishBlockers(sample, uploadLimit, c.get("user")).length > 0
      ) {
        return c.json({ error: "Sample is not ready to publish" }, 409);
      }
      const published = await repository.publish(id);
      if (mail && c.get("moderating")) {
        // ponytail: fire and forget; a retry queue if a lost notification ever matters.
        void notifySampleModerated({
          userSamples: userSampleRepository,
          mail,
          sample,
          fields: "published",
        });
      }
      return c.json({ data: published });
    })
    .put(
      "/:id/status",
      validateIdParam,
      validateStatusBody,
      unlockedSample,
      async (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        if (!isSampleEditor(c.get("role"))) {
          return c.json({ error: "Forbidden" }, 403);
        }
        if (!hasPermanentIgsn(sample)) {
          return c.json({ error: "Sample is not published" }, 409);
        }
        const updated = await repository.setStatus(
          c.req.valid("param").id,
          c.req.valid("json").status,
        );
        return c.json({ data: updated });
      },
    )
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
