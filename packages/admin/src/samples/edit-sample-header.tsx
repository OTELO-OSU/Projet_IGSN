import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { AdminSampleResponse } from "@projet-igsn/domain/sample/sample-validator";
import type { User } from "@projet-igsn/domain/user/model";

import { formatInternalId } from "@projet-igsn/domain/sample/format-internal-id";
import { canCreateImportTemplate } from "@projet-igsn/domain/user-sample/can-create-import-template";
import { canDeclareSubSample } from "@projet-igsn/domain/user-sample/can-declare-sub-sample";
import { canDeleteSample } from "@projet-igsn/domain/user-sample/can-delete-sample";
import { canDuplicateSample } from "@projet-igsn/domain/user-sample/can-duplicate-sample";
import { canRequestSampleDeletion } from "@projet-igsn/domain/user-sample/can-request-sample-deletion";
import { canPublishSamples } from "@projet-igsn/domain/user/can-publish-samples";

import { m } from "#/paraglide/messages.js";
import { PrintSampleLabelDialog } from "#/samples/print-sample-label-dialog.tsx";
import { SampleActionsMenu } from "#/samples/sample-actions-menu.tsx";
import { ShareSampleButton } from "#/samples/share-sample-button.tsx";
import { SynchronizationStatusBadge } from "#/samples/synchronization-status-badge.tsx";
import { templateCustomizationOfSample } from "#/samples/template-customization-of-sample.ts";

export function EditSampleHeader({
  sample,
  sampleId,
  me,
  publicHint,
  isDeleteDisabled,
  onDelete,
}: {
  sample: Sample & Pick<AdminSampleResponse, "role" | "managed">;
  sampleId: string;
  me: Pick<User, "superAdmin" | "status"> | undefined;
  publicHint: string | undefined;
  isDeleteDisabled: boolean;
  onDelete: () => void;
}) {
  const { role, managed } = sample;
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{m.edit_sample_title()}</h1>
        {sample.igsn ? (
          <p
            aria-label={m.field_igsn()}
            className="text-muted-foreground text-sm"
          >
            {sample.igsn}
          </p>
        ) : null}
        <SynchronizationStatusBadge sample={sample} />
        {sample.internalNumber === null ? null : (
          <p
            aria-label={m.field_internal_id()}
            className="text-muted-foreground text-sm"
          >
            {formatInternalId(sample.internalNumber)}
          </p>
        )}
        {publicHint ? (
          <p role="status" className="text-muted-foreground text-sm">
            {publicHint}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {sample.igsn == null || sample.status === "tombstone" ? null : (
          <PrintSampleLabelDialog igsn={sample.igsn} name={sample.name} />
        )}
        {sample.status === "tombstone" ? null : (
          <ShareSampleButton sampleId={sampleId} />
        )}
        <SampleActionsMenu
          sampleId={sampleId}
          sampleName={sample.name}
          canDuplicate={canDuplicateSample(sample)}
          canAddSubSample={canDeclareSubSample(sample, { role, managed })}
          canDelete={canDeleteSample(sample.role, sample)}
          canRequestDeletion={
            me != null && canRequestSampleDeletion(sample.role, sample, me)
          }
          isDeleteDisabled={isDeleteDisabled}
          templateInitialValues={
            me != null &&
            canPublishSamples(me) &&
            canCreateImportTemplate(sample)
              ? templateCustomizationOfSample(sample)
              : undefined
          }
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
