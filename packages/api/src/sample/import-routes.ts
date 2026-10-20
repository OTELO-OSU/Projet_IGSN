import type {
  ImportAccepted,
  ImportDuplicate,
  InvalidImport,
} from "@projet-igsn/domain/sample/import/import-report";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { canPublishSamples } from "@projet-igsn/domain/user/can-publish-samples";
import { Hono } from "hono";

import type { SampleAdminDeps, SampleAdminEnv } from "./admin-routes.ts";

import { requireActiveSession } from "../auth/active-session.ts";
import { getModerationScope } from "../auth/moderation-scope.ts";
import { requireCharterAccepted } from "../auth/require-charter-accepted.ts";
import { checkDataCite } from "../datacite/check-datacite.ts";
import { dataCiteConfig } from "../datacite/config.ts";
import { notifySuperAdmins } from "../mail/notify-super-admins.ts";
import { bulkEditTargets } from "./bulk-edit/bulk-edit-targets.ts";
import { validateBulkEdit } from "./bulk-edit/validate-bulk-edit.ts";
import { canEditCandidate } from "./can-edit-candidate.ts";
import { findImportDuplicates } from "./import-template/find-import-duplicates.ts";
import { internalIdRequestMail } from "./import-template/internal-id-request-mail.ts";
import { resolvePublishedParents } from "./import-template/resolve-published-parents.ts";
import { validateImport } from "./import-template/validate-import.ts";
import { importTemplateResponse } from "./import-template/workbook.ts";
import { notifySubSamplesImported } from "./notify-sub-samples-imported.ts";
import {
  catchChildNotEligible,
  ChildNotEligibleError,
} from "./service/replace-sample-children.ts";
import { templateManualGroups } from "./template-manual-groups.ts";
import {
  validateImportTemplateQuery,
  validateImportUpload,
  validateInternalIdRequestBody,
  validateReserveInternalIdsBody,
} from "./validator.ts";

const CHILD_CLAIMED_IMPORT: InvalidImport = {
  error: "Invalid import",
  issues: [{ code: "child_not_eligible" }],
};

export function createSampleImportRoutes({
  repository,
  userSampleRepository,
  manualGroups,
  users,
  stagedUploads,
  mail,
}: SampleAdminDeps) {
  return new Hono<SampleAdminEnv>()
    .get("/import-template", validateImportTemplateQuery, async (c) => {
      const { rows, manualGroupId, ...customization } = c.req.valid("query");
      const { attachable, manualGroup } = await templateManualGroups(
        manualGroups,
        c.get("user").id,
        manualGroupId,
      );
      return importTemplateResponse(
        rows,
        undefined,
        { ...customization, prefilledManualGroup: manualGroup },
        attachable,
      );
    })
    .post(
      "/import-template/reservation",
      validateReserveInternalIdsBody,
      async (c) => {
        const { count, manualGroupId, ...customization } = c.req.valid("json");
        const { attachable, manualGroup } = await templateManualGroups(
          manualGroups,
          c.get("user").id,
          manualGroupId,
        );
        return importTemplateResponse(
          count,
          await repository.reserveInternalNumbers(count),
          { ...customization, prefilledManualGroup: manualGroup },
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
    );
}
