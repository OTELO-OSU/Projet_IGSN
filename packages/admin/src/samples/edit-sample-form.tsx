import type { CurrentUser } from "@projet-igsn/domain/user/current-user";

import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";

import type { SampleFormTab } from "#/samples/sample-form-tabs.ts";
import type { SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import type { useDeleteSample } from "#/samples/use-delete-sample.ts";
import type { usePublishSample } from "#/samples/use-publish-sample.ts";
import type { SampleEditLockState } from "#/samples/use-sample-edit-lock.ts";
import type { useSample } from "#/samples/use-sample.ts";
import type { useSetSampleStatus } from "#/samples/use-set-sample-status.ts";
import type { useUpdateSample } from "#/samples/use-update-sample.ts";

import { describeSampleEditBlock } from "#/samples/describe-sample-edit-block.ts";
import { EditSampleAlerts } from "#/samples/edit-sample-alerts.tsx";
import { EditSampleHeader } from "#/samples/edit-sample-header.tsx";
import { parentFieldSuggestions } from "#/samples/parent-field-suggestions.ts";
import { resolveSamplePublicHint } from "#/samples/resolve-sample-public-hint.ts";
import { SampleForm } from "#/samples/sample-form.tsx";
import { useEditSampleActions } from "#/samples/use-edit-sample-actions.tsx";
import { SampleConflictError } from "#/samples/use-update-sample.ts";

export function EditSampleForm({
  sample,
  sampleId,
  me,
  heldByOther,
  canUpdate,
  attachmentChanges,
  parents,
  updateSample,
  publishSample,
  setStatus,
  deleteSample,
  defaultTab,
  onTabChange,
  onLeave,
  onDeleted,
}: {
  sample: NonNullable<ReturnType<typeof useSample>["data"]>;
  sampleId: string;
  me: CurrentUser | undefined;
  heldByOther: SampleEditLockState["heldByOther"];
  canUpdate: boolean;
  attachmentChanges: SampleAttachmentChanges;
  parents: Parameters<typeof parentFieldSuggestions>[0];
  updateSample: ReturnType<typeof useUpdateSample>;
  publishSample: ReturnType<typeof usePublishSample>;
  setStatus: ReturnType<typeof useSetSampleStatus>;
  deleteSample: ReturnType<typeof useDeleteSample>;
  defaultTab: SampleFormTab | undefined;
  onTabChange: (tab: SampleFormTab) => void;
  onLeave: () => void;
  onDeleted: () => void;
}) {
  const isPending =
    updateSample.isPending || publishSample.isPending || setStatus.isPending;
  const conflict =
    updateSample.error instanceof SampleConflictError
      ? updateSample.error.reason
      : undefined;
  const { lockedMessage, rejection } = describeSampleEditBlock(
    heldByOther,
    conflict,
  );
  const publicHint = resolveSamplePublicHint(sample);
  const formActions = useEditSampleActions({
    sample,
    sampleId,
    isPending,
    publicHint,
    lockedMessage,
    rejection,
    updateSample,
    publishSample,
    setStatus,
    onLeave,
  });

  return (
    <>
      <EditSampleHeader
        sample={sample}
        sampleId={sampleId}
        me={me}
        publicHint={publicHint}
        isDeleteDisabled={deleteSample.isPending || heldByOther != null}
        onDelete={() =>
          deleteSample.mutate(undefined, { onSuccess: onDeleted })
        }
      />

      <EditSampleAlerts
        sample={sample}
        sampleId={sampleId}
        canRetrySynchronization={isSampleEditor(sample.role)}
        lockedMessage={lockedMessage}
        rejection={rejection}
      />

      <SampleForm
        currentUser={me}
        defaultValues={sample}
        manualGroupOptions={sample.manualGroupOptions}
        parents={sample.parents}
        storedChildren={sample.children}
        storedSeries={sample.series}
        hasSubSamples={sample.hasSubSamples}
        canAddParent={canUpdate && !isVirtualSample(sample.type)}
        fieldSuggestions={
          parents.length > 1 ? parentFieldSuggestions(parents) : undefined
        }
        sampleId={sample.id}
        attachments={sample.attachments}
        attachmentChanges={attachmentChanges}
        isPending={isPending}
        status={sample.status}
        synchronizationStatus={sample.synchronizationStatus}
        defaultTab={defaultTab}
        onTabChange={onTabChange}
        onCancel={onLeave}
        {...formActions}
      />
    </>
  );
}
