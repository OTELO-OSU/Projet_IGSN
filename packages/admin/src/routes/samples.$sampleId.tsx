import type {
  CreateSample,
  SampleStatus,
} from "@projet-igsn/domain/sample/sample";

import {
  Alert,
  AlertDescription,
} from "@projet-igsn/design-system/components/ui/alert";
import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { canDeleteSample } from "@projet-igsn/domain/user-sample/can-delete-sample";
import { canRequestSampleDeletion } from "@projet-igsn/domain/user-sample/can-request-sample-deletion";
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InfoIcon, Trash2Icon } from "lucide-react";
import { z } from "zod";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { FRONTEND_URL } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";
import { RepublishButton } from "#/samples/republish-button.tsx";
import { RequestSampleDeletionDialog } from "#/samples/request-sample-deletion-dialog.tsx";
import { RestoreWithdrawnButton } from "#/samples/restore-withdrawn-button.tsx";
import { SampleForm } from "#/samples/sample-form.tsx";
import { ShareSampleButton } from "#/samples/share-sample-button.tsx";
import { useAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import { useDeleteSample } from "#/samples/use-delete-sample.ts";
import { usePublishSample } from "#/samples/use-publish-sample.ts";
import { useSampleEditLock } from "#/samples/use-sample-edit-lock.ts";
import { ForbiddenError, useSample } from "#/samples/use-sample.ts";
import { useSetSampleStatus } from "#/samples/use-set-sample-status.ts";
import {
  SampleConflictError,
  useUpdateSample,
} from "#/samples/use-update-sample.ts";

const SAVE_LABEL: Record<Exclude<SampleStatus, "tombstone">, () => string> = {
  draft: m.action_save_draft,
  published: m.action_publish_updates,
  withdrawn: m.action_save_changes,
};

export const Route = createFileRoute("/samples/$sampleId")({
  validateSearch: z.object({
    from: z.literal("moderation").optional().catch(undefined),
  }),
  component: EditSamplePage,
});

function EditSamplePage() {
  const { sampleId } = Route.useParams();
  const { from } = Route.useSearch();
  const listRoute = from === "moderation" ? "/samples/moderation" : "/";
  const me = useCurrentUser();
  const navigate = useNavigate();
  const query = useSample(sampleId);
  const updateSample = useUpdateSample(sampleId);
  const publishSample = usePublishSample(sampleId);
  const setStatus = useSetSampleStatus(sampleId);
  const deleteSample = useDeleteSample(sampleId);
  const { heldByOther } = useSampleEditLock(
    sampleId,
    query.data != null &&
      query.data.status !== "tombstone" &&
      canUpdateSample(query.data.role, query.data),
  );
  const attachmentChanges = useAttachmentChanges(
    sampleId,
    query.data?.attachments.length ?? 0,
  );

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

  const status = query.data.status;
  const managed = query.data.managed;
  const isTombstone = status === "tombstone";
  const mayToggleStatus = isSampleEditor(query.data.role);
  const isPending =
    updateSample.isPending || publishSample.isPending || setStatus.isPending;
  const conflict =
    updateSample.error instanceof SampleConflictError
      ? updateSample.error.reason
      : undefined;
  const lockedMessage = heldByOther
    ? heldByOther.name
      ? m.sample_locked_by({ name: heldByOther.name })
      : m.sample_locked_by_unknown()
    : undefined;
  const rejection =
    conflict === "locked"
      ? m.edit_sample_locked()
      : conflict === "stale"
        ? m.edit_sample_stale()
        : undefined;
  const publicHint = isTombstone
    ? m.sample_tombstone_hint()
    : status === "withdrawn"
      ? m.sample_withdrawn_hint()
      : undefined;
  const withdrawItem = {
    label: m.action_save_withdraw(),
    title: m.withdraw_sample_title(),
    description: m.withdraw_sample_warning(),
    onConfirm: (value: CreateSample) =>
      updateSample.mutate(value, {
        onSuccess: () => setStatus.mutate("withdrawn"),
      }),
  };
  const tombstoneItem = {
    label: m.action_save_tombstone(),
    title: m.tombstone_sample_title(),
    description: m.tombstone_sample_warning(),
    onConfirm: (value: CreateSample) =>
      updateSample.mutate(value, {
        onSuccess: () =>
          setStatus.mutate("tombstone", {
            onSuccess: () => void navigate({ to: listRoute }),
          }),
      }),
  };
  const statusMenu =
    status === "published" && mayToggleStatus
      ? {
          label: m.action_status_options(),
          items: managed ? [withdrawItem, tombstoneItem] : [withdrawItem],
        }
      : status === "withdrawn" && managed
        ? { label: m.action_status_options(), items: [tombstoneItem] }
        : undefined;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{m.edit_sample_title()}</h1>
            {canDeleteSample(query.data.role, query.data) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <ConfirmButton
                    variant="ghost"
                    size="icon"
                    aria-label={m.sample_delete_action()}
                    disabled={deleteSample.isPending || heldByOther != null}
                    title={m.sample_delete_title()}
                    description={m.sample_delete_description()}
                    confirmLabel={m.action_delete()}
                    cancelLabel={m.action_cancel()}
                    closeLabel={m.action_close()}
                    confirmPhrase={{
                      text: m.action_delete_confirm_phrase(),
                      label: m.action_delete_confirm_phrase_label({
                        phrase: m.action_delete_confirm_phrase(),
                      }),
                    }}
                    onConfirm={() =>
                      deleteSample.mutate(undefined, {
                        onSuccess: () => void navigate({ to: listRoute }),
                      })
                    }
                  >
                    <Trash2Icon aria-hidden />
                  </ConfirmButton>
                </TooltipTrigger>
                <TooltipContent>{m.sample_delete_action()}</TooltipContent>
              </Tooltip>
            )}
            {me.data != null &&
              canRequestSampleDeletion(
                query.data.role,
                query.data,
                me.data,
              ) && <RequestSampleDeletionDialog sampleId={sampleId} />}
          </div>
          {query.data.igsn ? (
            <p
              aria-label={m.field_igsn()}
              className="text-muted-foreground text-sm"
            >
              {query.data.igsn}
            </p>
          ) : null}
          {publicHint ? (
            <p role="status" className="text-muted-foreground text-sm">
              {publicHint}
            </p>
          ) : null}
        </div>
        {isTombstone ? null : <ShareSampleButton sampleId={sampleId} />}
      </div>

      {lockedMessage ? (
        <div role="status">
          <Alert role="none" variant="info">
            <InfoIcon />
            <AlertDescription>{lockedMessage}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {rejection ? (
        <Alert variant="destructive">
          <AlertDescription>{rejection}</AlertDescription>
        </Alert>
      ) : null}

      <SampleForm
        currentUser={me.data}
        defaultValues={
          (updateSample.isSuccess ? undefined : updateSample.variables) ??
          query.data
        }
        manualGroupOptions={query.data.manualGroupOptions}
        sampleId={query.data.id}
        attachments={query.data.attachments}
        attachmentChanges={attachmentChanges}
        isPending={isPending}
        status={status}
        readOnlyReason={
          isTombstone ? m.sample_tombstone_hint() : (lockedMessage ?? rejection)
        }
        statusAction={
          isTombstone ? (
            <>
              <RepublishButton
                disabled={isPending}
                onConfirm={() => setStatus.mutate("published")}
              />
              <RestoreWithdrawnButton
                disabled={isPending}
                onConfirm={() => setStatus.mutate("withdrawn")}
              />
            </>
          ) : status === "withdrawn" && mayToggleStatus ? (
            <RepublishButton
              disabled={isPending}
              onConfirm={() => setStatus.mutate("published")}
            />
          ) : undefined
        }
        onCancel={() => navigate({ to: listRoute })}
        secondaryAction={
          isTombstone
            ? undefined
            : {
                kind: "submit",
                label: SAVE_LABEL[status](),
                onSubmit: (value) => updateSample.mutate(value),
                menu: statusMenu,
              }
        }
        primaryAction={
          isTombstone
            ? undefined
            : query.data.igsn
              ? {
                  kind: "link",
                  label: m.action_view_public_page(),
                  href: `${FRONTEND_URL}/samples/${query.data.igsn}`,
                }
              : {
                  kind: "publish",
                  label: m.action_save_publish(),
                  onPublish: (value, publishStatus) =>
                    updateSample.mutate(value, {
                      onSuccess: () =>
                        publishSample.mutate(publishStatus, {
                          onSuccess: () => navigate({ to: listRoute }),
                        }),
                    }),
                }
        }
      />
    </>
  );
}
