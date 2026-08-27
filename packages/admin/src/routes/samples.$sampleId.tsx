import type { SampleStatus } from "@projet-igsn/domain/sample/sample";

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
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { InfoIcon, Trash2Icon } from "lucide-react";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { FRONTEND_URL } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";
import { RepublishButton } from "#/samples/republish-button.tsx";
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

const SAVE_LABEL: Record<SampleStatus, () => string> = {
  draft: m.action_save_draft,
  published: m.action_publish_updates,
  withdrawn: m.action_save_changes,
};

export const Route = createFileRoute("/samples/$sampleId")({
  component: EditSamplePage,
});

function EditSamplePage() {
  const { sampleId } = Route.useParams();
  const me = useCurrentUser();
  const navigate = useNavigate();
  const query = useSample(sampleId);
  const updateSample = useUpdateSample(sampleId);
  const publishSample = usePublishSample(sampleId);
  const setStatus = useSetSampleStatus(sampleId);
  const deleteSample = useDeleteSample(sampleId);
  const { heldByOther } = useSampleEditLock(
    sampleId,
    query.data != null && canUpdateSample(query.data.role, query.data),
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
                        onSuccess: () => void navigate({ to: "/" }),
                      })
                    }
                  >
                    <Trash2Icon aria-hidden />
                  </ConfirmButton>
                </TooltipTrigger>
                <TooltipContent>{m.sample_delete_action()}</TooltipContent>
              </Tooltip>
            )}
          </div>
          {query.data.igsn ? (
            <p
              aria-label={m.field_igsn()}
              className="text-muted-foreground text-sm"
            >
              {query.data.igsn}
            </p>
          ) : null}
          {query.data.status === "withdrawn" ? (
            <p role="status" className="text-muted-foreground text-sm">
              {m.sample_withdrawn_hint()}
            </p>
          ) : null}
        </div>
        <ShareSampleButton sampleId={sampleId} />
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
        publisher={me.data}
        defaultValues={
          (updateSample.isSuccess ? undefined : updateSample.variables) ??
          query.data
        }
        manualGroupOptions={query.data.manualGroupOptions}
        sampleId={query.data.id}
        attachments={query.data.attachments}
        attachmentChanges={attachmentChanges}
        isPending={isPending}
        status={query.data.status}
        readOnlyReason={lockedMessage ?? rejection}
        statusAction={
          query.data.status === "withdrawn" && mayToggleStatus ? (
            <RepublishButton
              disabled={isPending}
              onConfirm={() => setStatus.mutate("published")}
            />
          ) : undefined
        }
        onCancel={() => navigate({ to: "/" })}
        secondaryAction={{
          kind: "submit",
          label: SAVE_LABEL[query.data.status](),
          onSubmit: (value) => updateSample.mutate(value),
          menu:
            query.data.status === "published" && mayToggleStatus
              ? {
                  label: m.action_status_options(),
                  itemLabel: m.action_save_withdraw(),
                  title: m.withdraw_sample_title(),
                  description: m.withdraw_sample_warning(),
                  onConfirm: (value) =>
                    updateSample.mutate(value, {
                      onSuccess: () => setStatus.mutate("withdrawn"),
                    }),
                }
              : undefined,
        }}
        primaryAction={
          query.data.igsn
            ? {
                kind: "link",
                label: m.action_view_public_page(),
                href: `${FRONTEND_URL}/samples/${query.data.igsn}`,
              }
            : {
                kind: "publish",
                label: m.action_save_publish(),
                onPublish: (value, status) =>
                  updateSample.mutate(value, {
                    onSuccess: () =>
                      publishSample.mutate(status, {
                        onSuccess: () => navigate({ to: "/" }),
                      }),
                  }),
              }
        }
      />
    </>
  );
}
