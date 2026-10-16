import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleAttachmentRepository } from "@projet-igsn/domain/sample/attachment/repository";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { AdminSampleResponse } from "@projet-igsn/domain/sample/sample-validator";
import type { StagedUploadRepository } from "@projet-igsn/domain/staged-upload/repository";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { changedSampleFields } from "@projet-igsn/domain/sample/changed-sample-fields";
import { canSetSampleChildren } from "@projet-igsn/domain/sample/publication/can-set-sample-children";
import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { newPublishBlockers } from "@projet-igsn/domain/sample/publication/new-publish-blockers";
import { mergePublishedEdit } from "@projet-igsn/domain/sample/publication/published-field-lock";
import { canBecomeSeries } from "@projet-igsn/domain/sample/type/can-become-series";
import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { canDeleteSample } from "@projet-igsn/domain/user-sample/can-delete-sample";
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { isSampleOwner } from "@projet-igsn/domain/user-sample/is-sample-owner";
import { canEditFrozenSampleFields } from "@projet-igsn/domain/user/can-edit-frozen-sample-fields";
import { Hono } from "hono";

import type { ModerationEnv } from "../auth/require-user-moderation.ts";
import type { SendMail } from "../mail/send-mail.ts";
import type { SampleAccessEnv } from "./require-sample-access.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { requireCharterAccepted } from "../auth/require-charter-accepted.ts";
import { hasUnattachable } from "../manual-group/has-unattachable.ts";
import { createSampleListRoutes } from "./admin-list-routes.ts";
import { createSampleAttachmentRoutes } from "./attachment-routes.ts";
import { createSampleCollaboratorRoutes } from "./collaborator-routes.ts";
import { createSampleEditLockRoutes } from "./edit-lock-routes.ts";
import { findEligibleAddedParents } from "./find-eligible-added-parents.ts";
import { hasInvalidSeriesLink } from "./has-invalid-series-link.ts";
import { createSampleImportRoutes } from "./import-routes.ts";
import { isJoinableSeries } from "./is-joinable-series.ts";
import { notifySampleDeleted } from "./notify-sample-deleted.ts";
import { notifySampleModerated } from "./notify-sample-moderated.ts";
import { notifySubSampleDeclared } from "./notify-sub-sample-declared.ts";
import { createSamplePublicationRoutes } from "./publication-routes.ts";
import { requireEditLock } from "./require-edit-lock.ts";
import { requireSampleAccess } from "./require-sample-access.ts";
import { CHILD_NOT_ELIGIBLE_MESSAGE } from "./service/replace-sample-children.ts";
import { NOT_ATTACHABLE } from "./template-manual-groups.ts";
import { uploadLimit } from "./upload-limit.ts";
import {
  validateCreateSampleBody,
  validateIdParam,
  validateUpdateSampleBody,
} from "./validator.ts";
import { withSeriesId } from "./with-series-id.ts";

const PARENT_NOT_ELIGIBLE = {
  error: "Parent sample not eligible",
} as const;

const CHILD_NOT_ELIGIBLE = {
  error: CHILD_NOT_ELIGIBLE_MESSAGE,
} as const;

const CHILDREN_NEED_PUBLICATION = {
  error: "Children need a published series",
} as const;

const SERIES_NEEDS_PUBLICATION = {
  error: "A sample joins a series once published",
} as const;

const SERIES_NOT_ELIGIBLE = { error: "Series not eligible" } as const;

const SERIES_IN_LINEAGE = {
  error: "A series of samples has no parent nor sub-sample",
} as const;

function sameGroupIds(submitted: string[], stored: string[]) {
  const asked = new Set(submitted);
  return asked.size === stored.length && stored.every((id) => asked.has(id));
}

export type SampleAdminEnv = {
  Variables: SampleAccessEnv["Variables"] & ModerationEnv["Variables"];
};

export type SampleAdminDeps = {
  repository: SampleRepository;
  attachmentsRepository: SampleAttachmentRepository;
  userSampleRepository: UserSampleRepository;
  manualGroups: ManualGroupRepository;
  users: UserRepository;
  stagedUploads: StagedUploadRepository;
  mail?: { sendMail: SendMail; adminUrl: string };
};

export function createSampleAdminRoutes(
  repository: SampleRepository,
  attachmentsRepository: SampleAttachmentRepository,
  userSampleRepository: UserSampleRepository,
  manualGroups: ManualGroupRepository,
  users: UserRepository,
  stagedUploads: StagedUploadRepository,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  const deps: SampleAdminDeps = {
    repository,
    attachmentsRepository,
    userSampleRepository,
    manualGroups,
    users,
    stagedUploads,
    mail,
  };

  const accessibleSample = requireSampleAccess(repository, users);

  const unlockedSample = requireEditLock(repository);

  return new Hono<SampleAdminEnv>()
    .route("/", createSampleListRoutes(deps))
    .route("/", createSampleImportRoutes(deps))
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
        managed: c.get("managed"),
        manualGroupOptions: isSampleOwner(c.get("role"))
          ? await manualGroups.listForSampleOwner(sample.id)
          : [],
      };
      return c.json(body);
    })
    .post(
      "/",
      requireCharterAccepted(users),
      validateCreateSampleBody,
      async (c) => {
        const input = c.req.valid("json");
        const user = c.get("user");
        const submitted = input.manualGroupIds ?? [];
        if (submitted.length > 0) {
          const attachable = await manualGroups.listAttachableForUser(user.id);
          if (
            hasUnattachable(
              submitted,
              attachable.map((group) => group.id),
            )
          ) {
            return c.json(NOT_ATTACHABLE, 422);
          }
        }
        const parents = await findEligibleAddedParents(
          repository,
          users,
          user,
          { parents: [] },
          input.parentIds,
        );
        if (!parents) {
          return c.json(PARENT_NOT_ELIGIBLE, 422);
        }
        if ((input.childIds ?? []).length > 0) {
          return c.json(CHILDREN_NEED_PUBLICATION, 422);
        }
        if (input.seriesId != null) {
          return c.json(SERIES_NEEDS_PUBLICATION, 422);
        }
        const sample = await repository.create(input, user);
        notifySubSampleDeclared({
          userSamples: userSampleRepository,
          mail,
          declarer: user,
          subSample: sample,
          parents,
        });
        return c.json({ data: sample }, 201);
      },
    )
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
        const addedParents = await findEligibleAddedParents(
          repository,
          users,
          c.get("user"),
          current,
          input.parentIds,
        );
        if (!addedParents) {
          return c.json(PARENT_NOT_ELIGIBLE, 422);
        }
        const wasPublished = hasPermanentIgsn(current);
        const toPersist =
          wasPublished && !canEditFrozenSampleFields(c.get("user"))
            ? mergePublishedEdit(current, input)
            : input;
        if (
          wasPublished &&
          newPublishBlockers(current, toPersist, uploadLimit).length > 0
        ) {
          return c.json(
            {
              error: "Update would make the published sample unpublishable",
              reason: "unpublishable",
            },
            409,
          );
        }
        if (
          isVirtualSample(toPersist.type) &&
          (!canBecomeSeries(current) || addedParents.length > 0)
        ) {
          return c.json(SERIES_IN_LINEAGE, 422);
        }
        if (
          (toPersist.childIds ?? []).length > 0 &&
          !canSetSampleChildren(current)
        ) {
          return c.json(CHILDREN_NEED_PUBLICATION, 422);
        }
        if (
          await hasInvalidSeriesLink(
            repository,
            users,
            c.get("user"),
            toPersist,
            current,
          )
        ) {
          return c.json(CHILD_NOT_ELIGIBLE, 422);
        }
        if (
          toPersist.seriesId != null &&
          toPersist.seriesId !== current.series?.id &&
          !(await isJoinableSeries(
            repository,
            users,
            c.get("user"),
            toPersist.seriesId,
            current,
          ))
        ) {
          return c.json(SERIES_NOT_ELIGIBLE, 422);
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
        notifySubSampleDeclared({
          userSamples: userSampleRepository,
          mail,
          declarer: c.get("user"),
          subSample: sample,
          parents: addedParents,
        });
        if (mail && c.get("moderating")) {
          const fields = changedSampleFields(withSeriesId(current), toPersist);
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
    .delete(
      "/:id",
      requireActiveSession,
      validateIdParam,
      unlockedSample,
      async (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Not found" }, 404);
        }
        if (!canDeleteSample(c.get("role"), sample)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const id = c.req.valid("param").id;
        const collaborators = await userSampleRepository.listCollaborators(id);
        await repository.remove(id);
        await attachmentsRepository.removeAll(id);
        if (mail) {
          void notifySampleDeleted({
            collaborators,
            deleter: c.get("user"),
            sample,
            mail,
          });
        }
        return c.body(null, 204);
      },
    )
    .route("/", createSampleCollaboratorRoutes(deps))
    .route("/", createSampleEditLockRoutes(deps))
    .route("/", createSamplePublicationRoutes(deps))
    .route("/", createSampleAttachmentRoutes(deps));
}
