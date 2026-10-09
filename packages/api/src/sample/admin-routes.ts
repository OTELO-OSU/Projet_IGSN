import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { SampleAttachmentRepository } from "@projet-igsn/domain/sample/attachment/repository";
import type {
  SampleEditLockResponse,
  SampleLocked,
} from "@projet-igsn/domain/sample/edit-lock";
import type {
  ImportAccepted,
  ImportDuplicate,
  InvalidImport,
} from "@projet-igsn/domain/sample/import/import-report";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";
import type { SeriesLinkCandidate } from "@projet-igsn/domain/sample/repository";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";
import type {
  AdminListSamplesResponse,
  AdminSampleResponse,
  ListSamplesQuery,
} from "@projet-igsn/domain/sample/sample-validator";
import type { StagedUploadRepository } from "@projet-igsn/domain/staged-upload/repository";
import type { UserSampleRepository } from "@projet-igsn/domain/user-sample/repository";
import type { SampleCollaboratorsResponse } from "@projet-igsn/domain/user-sample/user-sample-validator";
import type { User } from "@projet-igsn/domain/user/model";
import type { UserRepository } from "@projet-igsn/domain/user/repository";

import { changedSampleFields } from "@projet-igsn/domain/sample/changed-sample-fields";
import { canSetSampleChildren } from "@projet-igsn/domain/sample/publication/can-set-sample-children";
import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { isPublicationQueued } from "@projet-igsn/domain/sample/publication/is-publication-queued";
import { newPublishBlockers } from "@projet-igsn/domain/sample/publication/new-publish-blockers";
import { mergePublishedEdit } from "@projet-igsn/domain/sample/publication/published-field-lock";
import { samplePublishBlockers } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { publishQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { canBecomeSeries } from "@projet-igsn/domain/sample/type/can-become-series";
import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { canDeleteSample } from "@projet-igsn/domain/user-sample/can-delete-sample";
import { canGrantRole } from "@projet-igsn/domain/user-sample/can-grant-role";
import { canManageCollaborators } from "@projet-igsn/domain/user-sample/can-manage-collaborators";
import { canRequestSampleDeletion } from "@projet-igsn/domain/user-sample/can-request-sample-deletion";
import { canSetSampleStatus } from "@projet-igsn/domain/user-sample/can-set-sample-status";
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";
import { isSampleOwner } from "@projet-igsn/domain/user-sample/is-sample-owner";
import { canEditFrozenSampleFields } from "@projet-igsn/domain/user/can-edit-frozen-sample-fields";
import { canPublishSamples } from "@projet-igsn/domain/user/can-publish-samples";
import { canReceiveMail } from "@projet-igsn/domain/user/can-receive-mail";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { ModerationEnv } from "../auth/require-user-moderation.ts";
import type { SendMail } from "../mail/send-mail.ts";
import type { SampleAccessEnv } from "./require-sample-access.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { getModerationScope } from "../auth/moderation-scope.ts";
import { requireCharterAccepted } from "../auth/require-charter-accepted.ts";
import { requireUserModeration } from "../auth/require-user-moderation.ts";
import { checkDataCite } from "../datacite/check-datacite.ts";
import { dataCiteConfig } from "../datacite/config.ts";
import { notifySuperAdmins } from "../mail/notify-super-admins.ts";
import { trySendMail } from "../mail/try-send-mail.ts";
import { hasUnattachable } from "../manual-group/has-unattachable.ts";
import { sampleInvitationMail } from "../user-sample/sample-invitation-mail.ts";
import { sampleRemovalMail } from "../user-sample/sample-removal-mail.ts";
import { attachmentDownload } from "./attachment-download.ts";
import { bulkEditTargets } from "./bulk-edit/bulk-edit-targets.ts";
import { samplesExportResponse } from "./bulk-edit/export-workbook.ts";
import { validateBulkEdit } from "./bulk-edit/validate-bulk-edit.ts";
import { findEligibleAddedParents } from "./find-eligible-added-parents.ts";
import { findImportDuplicates } from "./import-template/find-import-duplicates.ts";
import { internalIdRequestMail } from "./import-template/internal-id-request-mail.ts";
import { resolvePublishedParents } from "./import-template/resolve-published-parents.ts";
import { validateImport } from "./import-template/validate-import.ts";
import { importTemplateResponse } from "./import-template/workbook.ts";
import { isEligibleChild } from "./is-eligible-child.ts";
import { notifyEmbargo } from "./notify-embargo.ts";
import { notifySampleDeleted } from "./notify-sample-deleted.ts";
import { notifySampleModerated } from "./notify-sample-moderated.ts";
import { notifySubSampleDeclared } from "./notify-sub-sample-declared.ts";
import { notifySubSamplesImported } from "./notify-sub-samples-imported.ts";
import { requireEditLock } from "./require-edit-lock.ts";
import { effectiveRole, requireSampleAccess } from "./require-sample-access.ts";
import { sampleDeletionRequestMail } from "./sample-deletion-request-mail.ts";
import {
  catchChildNotEligible,
  CHILD_NOT_ELIGIBLE_MESSAGE,
  ChildNotEligibleError,
} from "./service/replace-sample-children.ts";
import { uploadLimit } from "./upload-limit.ts";
import {
  validateAddCollaboratorBody,
  validateAttachmentParams,
  validateAttachmentUpload,
  validateCheckDuplicatesBody,
  validateCollaboratorParams,
  validateCreateSampleBody,
  validateExportBody,
  validateIdParam,
  validateImportUpload,
  validateImportTemplateQuery,
  validateInternalIdRequestBody,
  validateListQuery,
  validateRequestDeletionBody,
  validateReserveInternalIdsBody,
  validateStatusBody,
  validateUpdateSampleBody,
} from "./validator.ts";

const NOT_ATTACHABLE = {
  error: "Manual group not attachable to this sample",
} as const;

const PARENT_NOT_ELIGIBLE = {
  error: "Parent sample not eligible",
} as const;

const CHILD_NOT_ELIGIBLE = {
  error: CHILD_NOT_ELIGIBLE_MESSAGE,
} as const;

const CHILDREN_NEED_PUBLICATION = {
  error: "Children need a published series",
} as const;

const CHILD_CLAIMED_IMPORT: InvalidImport = {
  error: "Invalid import",
  issues: [{ code: "child_not_eligible" }],
};

const SERIES_IN_LINEAGE = {
  error: "A series of samples has no parent nor sub-sample",
} as const;

function sameGroupIds(submitted: string[], stored: string[]) {
  const asked = new Set(submitted);
  return asked.size === stored.length && stored.every((id) => asked.has(id));
}

type InstitutionalFacets =
  | "institutionalOrganization"
  | "institutionalOsu"
  | "institutionalLaboratory"
  | "bbox";

function adminListQuery<Query extends Partial<ListSamplesQuery>>({
  institutionalOrganization: _organization,
  institutionalOsu: _osu,
  institutionalLaboratory: _laboratory,
  bbox: _bbox,
  ...rest
}: Query): Omit<Query, InstitutionalFacets> {
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
  stagedUploads: StagedUploadRepository,
  mail?: { sendMail: SendMail; adminUrl: string },
) {
  const accessibleSample = requireSampleAccess(repository, users);

  const canEditCandidate = (
    user: Pick<User, "superAdmin">,
    candidate: SeriesLinkCandidate,
  ) => isSampleEditor(effectiveRole(user, candidate.role, candidate.moderated));

  const hasInvalidSeriesLink = async (
    user: Pick<User, "id" | "superAdmin">,
    { childIds = [], type }: Pick<CreateSample, "childIds" | "type">,
    current: Pick<Sample, "id" | "children">,
  ): Promise<boolean> => {
    const stored = current.children.map(({ id }) => id);
    const added = childIds.filter((id) => !stored.includes(id));
    const toSeries = isVirtualSample(type);
    if (!toSeries && added.length === 0) return false;
    const candidates = await repository.listSeriesLinkCandidates(
      [current.id, ...added],
      user.id,
      added.length > 0 ? await getModerationScope(users, user) : null,
    );
    if (toSeries && candidates.get(current.id)?.seriesId) return true;
    return added.some((childId) => {
      const child = candidates.get(childId);
      return (
        child === undefined ||
        !canEditCandidate(user, child) ||
        !isEligibleChild(child, current.id)
      );
    });
  };
  const unlockedSample = requireEditLock(repository);

  const templateManualGroups = async (
    userId: string,
    manualGroupId: string | undefined,
  ): Promise<{ attachable: ManualGroup[]; manualGroup?: ManualGroup }> => {
    const attachable = await manualGroups.listAttachableForUser(userId);
    const manualGroup = attachable.find((group) => group.id === manualGroupId);
    if (manualGroupId !== undefined && manualGroup === undefined) {
      throw new HTTPException(422, { message: NOT_ATTACHABLE.error });
    }
    return { attachable, manualGroup };
  };

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
    .post("/duplicates", validateCheckDuplicatesBody, async (c) => {
      const { exclude, ...criteria } = c.req.valid("json");
      return c.json({
        data: await repository.findDuplicates(criteria, exclude),
      });
    })
    .get("/import-template", validateImportTemplateQuery, async (c) => {
      const { rows, manualGroupId, ...customization } = c.req.valid("query");
      const { attachable, manualGroup } = await templateManualGroups(
        c.get("user").id,
        manualGroupId,
      );
      return importTemplateResponse(
        rows,
        undefined,
        { ...customization, manualGroup },
        attachable,
      );
    })
    .post(
      "/import-template/reservation",
      validateReserveInternalIdsBody,
      async (c) => {
        const { count, manualGroupId, ...customization } = c.req.valid("json");
        const { attachable, manualGroup } = await templateManualGroups(
          c.get("user").id,
          manualGroupId,
        );
        return importTemplateResponse(
          count,
          await repository.reserveInternalNumbers(count),
          { ...customization, manualGroup },
          attachable,
        );
      },
    )
    .post(
      "/import",
      requireCharterAccepted(users),
      validateImportUpload,
      async (c) => {
        let parents: ReadonlyMap<string, Sample> = new Map();
        const form = c.req.valid("form");
        const ids = form["stagedUploadIds[]"] ?? [];
        const staged = new Map(
          (await stagedUploads.findCompleteOwned(ids, c.get("user").id)).map(
            (upload) => [upload.name, upload],
          ),
        );
        if (staged.size !== ids.length) {
          return c.json({ error: "Invalid staged uploads" }, 400);
        }
        const { issues, samples } = await validateImport(
          await form.file.arrayBuffer(),
          new Set(staged.keys()),
          (numbers) => repository.unavailableInternalNumbers(numbers),
          () => manualGroups.listAttachableForUser(c.get("user").id),
          async (igsns) =>
            (parents = await resolvePublishedParents(repository, igsns)),
        );
        if (issues.length > 0) {
          const body: InvalidImport = { error: "Invalid import", issues };
          return c.json(body, 422);
        }
        if (!(await checkDataCite(dataCiteConfig()))) {
          return c.json({ error: "DataCite unavailable" }, 503);
        }
        const user = c.get("user");
        const count = await repository.createPublishing(
          samples.map((sample) => ({
            ...sample,
            attachments: sample.attachments.map((metadata) => {
              const { id, mediaType } = staged.get(metadata.name)!;
              return { input: { ...metadata, mediaType }, stagedId: id };
            }),
          })),
          user,
        );
        notifySubSamplesImported({
          userSamples: userSampleRepository,
          mail,
          declarer: user,
          parents: [...parents.values()],
          parentIds: samples.flatMap(({ input }) => input.parentIds ?? []),
        });
        return c.json({ count } satisfies ImportAccepted, 200);
      },
    )
    .post("/import/duplicates", validateImportUpload, async (c) => {
      const data = await findImportDuplicates(
        await c.req.valid("form").file.arrayBuffer(),
        (criteria) => repository.findDuplicatesOfEach(criteria),
      );
      return c.json({ data } satisfies { data: ImportDuplicate[] });
    })
    .post("/bulk-edit", validateImportUpload, async (c) => {
      const user = c.get("user");
      if (!canPublishSamples(user)) {
        return c.json({ error: "Forbidden" }, 403);
      }
      const { issues, samples } = await validateBulkEdit(
        await c.req.valid("form").file.arrayBuffer(),
        (numbers) => bulkEditTargets(repository, users, user, numbers),
        {
          resolve: async (igsns) =>
            repository.listPublicSeriesLinkCandidatesByIgsns(
              igsns,
              user.id,
              await getModerationScope(users, user),
            ),
          canEdit: (candidate) => canEditCandidate(user, candidate),
        },
        (igsns) => resolvePublishedParents(repository, igsns),
        (ids) => repository.listDescendantIds(ids),
      );
      if (issues.length > 0) {
        const body: InvalidImport = { error: "Invalid import", issues };
        return c.json(body, 422);
      }
      if (!(await checkDataCite(dataCiteConfig()))) {
        return c.json({ error: "DataCite unavailable" }, 503);
      }
      const count = await catchChildNotEligible(
        repository.updatePublishing(samples),
      );
      if (count instanceof ChildNotEligibleError) {
        return c.json(CHILD_CLAIMED_IMPORT, 422);
      }
      return c.json({ count } satisfies ImportAccepted, 200);
    })
    .post(
      "/import/internal-id-request",
      requireActiveSession,
      validateInternalIdRequestBody,
      (c) => {
        if (mail) {
          const requester = c.get("user");
          const { internalIds } = c.req.valid("json");
          // ponytail: fire and forget; a retry queue if a lost request ever matters.
          void notifySuperAdmins(
            users,
            () =>
              internalIdRequestMail({
                requester,
                internalIds,
                adminUrl: mail.adminUrl,
              }),
            mail.sendMail,
            "Could not mail the internal ID request",
          );
        }
        return c.body(null, 204);
      },
    )
    .post("/export", validateExportBody, async (c) => {
      const request = c.req.valid("json");
      const user = c.get("user");
      const { data } = await repository.listExportable(
        request.mode === "filters"
          ? { ...request, query: adminListQuery(request.query) }
          : request,
        user.id,
        request.moderated ? await getModerationScope(users, user) : null,
      );
      return samplesExportResponse(data);
    })
    .post("/retry-synchronization", async (c) =>
      c.json({
        count: await repository.retryFailedSynchronizations(c.get("user").id),
      }),
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
                sampleUrl: new URL(`samples/${id}`, mail.adminUrl).toString(),
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
        const sample = c.get("sample");
        if (!sample) {
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
        if (mail && canReceiveMail(removed.removed)) {
          void trySendMail(
            removed.removed.email,
            () =>
              sampleRemovalMail({
                removed: removed.removed,
                remover: c.get("user"),
                sampleName: sample.name,
                url: mail.adminUrl,
              }),
            mail.sendMail,
            "Could not mail the collaborator removal",
          );
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
        if (await hasInvalidSeriesLink(c.get("user"), toPersist, current)) {
          return c.json(CHILD_NOT_ELIGIBLE, 422);
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
    .post(
      "/:id/deletion-request",
      requireActiveSession,
      validateIdParam,
      validateRequestDeletionBody,
      async (c) => {
        const sample = c.get("sample");
        if (!sample) {
          return c.json({ error: "Sample not found" }, 404);
        }
        const requester = c.get("user");
        if (!canRequestSampleDeletion(c.get("role"), sample, requester)) {
          return c.json({ error: "Forbidden" }, 403);
        }
        if (mail) {
          const { reason } = c.req.valid("json");
          // ponytail: fire and forget; a retry queue if a lost request ever matters.
          void notifySuperAdmins(
            users,
            () =>
              sampleDeletionRequestMail({
                requester,
                sample,
                reason,
                adminUrl: mail.adminUrl,
              }),
            mail.sendMail,
            "Could not mail the sample deletion request",
          );
        }
        return c.body(null, 204);
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
      const query = publishQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json({ error: "Invalid publish status" }, 400);
      }
      const { status, publishedAt } = query.data;
      if (isPublicationQueued(sample) || hasPermanentIgsn(sample)) {
        return c.json({ error: "Sample is already published" }, 409);
      }
      // ponytail: the guard's read and publish are separate transactions. Read and publish in one txn if that race matters.
      if (
        samplePublishBlockers(sample, uploadLimit, c.get("user")).length > 0
      ) {
        return c.json({ error: "Sample is not ready to publish" }, 409);
      }
      const published = await repository.publish(id, status, publishedAt);
      if (!published) {
        return c.json({ error: "Not found" }, 404);
      }
      if (mail && status === "embargo") {
        void notifyEmbargo({
          event: "started",
          userSamples: userSampleRepository,
          sample: published,
          actor: c.get("user"),
          mail,
        });
      }
      if (mail && status !== "embargo" && c.get("moderating")) {
        // ponytail: fire and forget; a retry queue if a lost notification ever matters.
        void notifySampleModerated({
          userSamples: userSampleRepository,
          mail,
          sample,
          fields: status,
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
        if (!hasPermanentIgsn(sample)) {
          return c.json({ error: "Sample is not published" }, 409);
        }
        const body = c.req.valid("json");
        if (
          !canSetSampleStatus(
            c.get("role"),
            c.get("managed"),
            sample,
            body.status,
          )
        ) {
          return c.json({ error: "Forbidden" }, 403);
        }
        const id = c.req.valid("param").id;
        const updated = await repository.setStatus(id, body);
        if (!updated) {
          return c.json({ error: "Not found" }, 404);
        }
        if (
          mail &&
          sample.status === "embargo" &&
          body.status === "published"
        ) {
          void notifyEmbargo({
            event: "ended",
            userSamples: userSampleRepository,
            sample: updated,
            actor: c.get("user"),
            mail,
          });
        }
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
        const { file, title, targetResourceType, description } =
          c.req.valid("form");
        const created = await attachmentsRepository.create(
          c.req.valid("param").id,
          {
            name: file.name,
            mediaType: file.type || "application/octet-stream",
            title: title ?? null,
            targetResourceType: targetResourceType ?? null,
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
