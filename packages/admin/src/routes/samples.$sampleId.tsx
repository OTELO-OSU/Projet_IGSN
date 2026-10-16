import type { CurrentUser } from "@projet-igsn/domain/user/current-user";

import { isVirtualSample } from "@projet-igsn/domain/sample/type/is-virtual-sample";
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { useQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import type { SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import type { SampleEditLockState } from "#/samples/use-sample-edit-lock.ts";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { m } from "#/paraglide/messages.js";
import { EditSampleAlerts } from "#/samples/edit-sample-alerts.tsx";
import { EditSampleHeader } from "#/samples/edit-sample-header.tsx";
import { parentFieldSuggestions } from "#/samples/parent-field-suggestions.ts";
import { sampleEditBlockReason } from "#/samples/sample-edit-block-reason.ts";
import {
  type SampleFormTab,
  sampleFormTabSchema,
} from "#/samples/sample-form-tabs.ts";
import { SampleForm } from "#/samples/sample-form.tsx";
import { samplePublicHint } from "#/samples/sample-public-hint.ts";
import { useAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import { useDeleteSample } from "#/samples/use-delete-sample.ts";
import { useEditSampleActions } from "#/samples/use-edit-sample-actions.tsx";
import { parentSampleQueryOptions } from "#/samples/use-parent-sample.ts";
import { usePublishSample } from "#/samples/use-publish-sample.ts";
import { useSampleEditLock } from "#/samples/use-sample-edit-lock.ts";
import { ForbiddenError, useSample } from "#/samples/use-sample.ts";
import { useSetSampleStatus } from "#/samples/use-set-sample-status.ts";
import {
  SampleConflictError,
  useUpdateSample,
} from "#/samples/use-update-sample.ts";
import { useApiClient } from "#/use-api-client.ts";

export const Route = createFileRoute("/samples/$sampleId")({
  validateSearch: z.object({
    from: z.literal("moderation").optional().catch(undefined),
    tab: sampleFormTabSchema.optional().catch(undefined),
  }),
  component: EditSamplePage,
});

function EditSamplePage() {
  const { sampleId } = Route.useParams();
  const { from, tab } = Route.useSearch();
  const listRoute = from === "moderation" ? "/samples/moderation" : "/";
  const me = useCurrentUser();
  const navigate = Route.useNavigate();
  const query = useSample(sampleId);
  const updateSample = useUpdateSample(sampleId);
  const publishSample = usePublishSample();
  const setStatus = useSetSampleStatus(sampleId);
  const deleteSample = useDeleteSample(sampleId);
  const canUpdate =
    query.data != null && canUpdateSample(query.data.role, query.data);
  const { heldByOther } = useSampleEditLock(sampleId, canUpdate);
  const attachmentChanges = useAttachmentChanges(sampleId);
  const apiFetch = useApiClient();
  const sampleParents = query.data?.parents ?? [];
  const parentQueries = useQueries({
    queries: (sampleParents.length > 1 ? sampleParents : []).map(({ id }) =>
      parentSampleQueryOptions(apiFetch, id),
    ),
  });

  if (query.isPending || me.isPending) {
    return <p>{m.samples_loading()}</p>;
  }
  if (query.isError) {
    return (
      <p role="alert">
        {query.error instanceof ForbiddenError
          ? m.sample_forbidden()
          : m.samples_error()}
      </p>
    );
  }
  if (!query.data) {
    return <p role="alert">{m.sample_not_found()}</p>;
  }

  return (
    <EditSampleForm
      sample={query.data}
      sampleId={sampleId}
      me={me.data}
      heldByOther={heldByOther}
      canUpdate={canUpdate}
      attachmentChanges={attachmentChanges}
      parents={parentQueries
        .map((parentQuery) => parentQuery.data)
        .filter((parent) => parent != null)}
      updateSample={updateSample}
      publishSample={publishSample}
      setStatus={setStatus}
      deleteSample={deleteSample}
      defaultTab={tab}
      onTabChange={(next) =>
        navigate({
          search: (prev) => ({ ...prev, tab: next }),
          replace: true,
        })
      }
      onLeave={() => void navigate({ to: listRoute })}
      onDeleted={() => void navigate({ to: listRoute, ignoreBlocker: true })}
    />
  );
}

function EditSampleForm({
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
  const { lockedMessage, rejection } = sampleEditBlockReason(
    heldByOther,
    conflict,
  );
  const publicHint = samplePublicHint(sample);
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
