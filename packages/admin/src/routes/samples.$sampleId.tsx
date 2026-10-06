import type { SampleStatus } from "@projet-igsn/domain/sample/sample";
import type {
  PublishStatus,
  SetSampleStatusBody,
} from "@projet-igsn/domain/sample/sample-validator";

import {
  Alert,
  AlertDescription,
} from "@projet-igsn/design-system/components/ui/alert";
import { formatInternalId } from "@projet-igsn/domain/sample/format-internal-id";
import { canCreateImportTemplate } from "@projet-igsn/domain/user-sample/can-create-import-template";
import { canDeclareSubSample } from "@projet-igsn/domain/user-sample/can-declare-sub-sample";
import { canDeleteSample } from "@projet-igsn/domain/user-sample/can-delete-sample";
import { canDuplicateSample } from "@projet-igsn/domain/user-sample/can-duplicate-sample";
import { canRequestSampleDeletion } from "@projet-igsn/domain/user-sample/can-request-sample-deletion";
import { canSetSampleStatus } from "@projet-igsn/domain/user-sample/can-set-sample-status";
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { useQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { InfoIcon } from "lucide-react";
import { z } from "zod";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { frontendSampleUrl } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";
import { parentFieldSuggestions } from "#/samples/parent-field-suggestions.ts";
import { SampleActionsMenu } from "#/samples/sample-actions-menu.tsx";
import { sampleFormTabSchema } from "#/samples/sample-form-tabs.ts";
import {
  SampleForm,
  type SampleFormProps,
  type SampleSubmitMenuItem,
} from "#/samples/sample-form.tsx";
import { SetStatusButton } from "#/samples/set-status-button.tsx";
import { ShareSampleButton } from "#/samples/share-sample-button.tsx";
import { templateCustomizationOfSample } from "#/samples/template-customization-of-sample.ts";
import { useAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import { useDeleteSample } from "#/samples/use-delete-sample.ts";
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

const PUBLIC_HINT: Partial<Record<SampleStatus, () => string>> = {
  withdrawn: m.sample_withdrawn_hint,
  tombstone: m.sample_tombstone_hint,
};

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
  const { heldByOther } = useSampleEditLock(
    sampleId,
    query.data != null && canUpdateSample(query.data.role, query.data),
  );
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

  const { role, managed, status } = query.data;
  const isTombstone = status === "tombstone";
  const can = (to: SetSampleStatusBody["status"]) =>
    canSetSampleStatus(role, managed, { status }, to);
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
  const publicHint = PUBLIC_HINT[status]?.();
  const parents = parentQueries
    .map((parentQuery) => parentQuery.data)
    .filter((parent) => parent != null);
  const restoreButton = (to: PublishStatus, menuStatus?: PublishStatus) => (
    <SetStatusButton
      status={to}
      menuStatus={menuStatus}
      disabled={isPending}
      onConfirm={(status) => setStatus.mutate(status)}
    />
  );
  const withdrawItem: SampleSubmitMenuItem = {
    label: m.action_withdraw(),
    title: m.withdraw_sample_title(),
    description: m.withdraw_sample_warning(),
    onConfirm: (value) =>
      updateSample.mutateAsync(value).then(() => setStatus.mutate("withdrawn")),
  };
  const tombstoneItem: SampleSubmitMenuItem = {
    label: m.action_tombstone(),
    title: m.tombstone_sample_title(),
    description: m.tombstone_sample_warning(),
    onConfirm: (value) =>
      updateSample.mutateAsync(value).then(() =>
        setStatus.mutate("tombstone", {
          onSuccess: () => void navigate({ to: listRoute }),
        }),
      ),
  };
  const statusItems = [
    ...(status === "published" && can("withdrawn") ? [withdrawItem] : []),
    ...(can("tombstone") ? [tombstoneItem] : []),
  ];
  const formActions: Pick<
    SampleFormProps,
    "readOnlyReason" | "statusAction" | "secondaryAction" | "primaryAction"
  > = isTombstone
    ? {
        readOnlyReason: publicHint,
        statusAction: restoreButton("published", "withdrawn"),
      }
    : {
        readOnlyReason: lockedMessage ?? rejection,
        statusAction:
          status === "withdrawn" && can("published")
            ? restoreButton("published")
            : undefined,
        secondaryAction: {
          kind: "submit",
          label: m.action_save(),
          onSubmit: (value) => updateSample.mutateAsync(value),
          menu: statusItems.length
            ? { label: m.action_status_options(), items: statusItems }
            : undefined,
        },
        primaryAction: query.data.igsn
          ? {
              kind: "link",
              label: m.action_view_public_page(),
              href: frontendSampleUrl(query.data.igsn),
            }
          : {
              kind: "publish",
              label: m.action_publish(),
              onPublish: (value, publishStatus) =>
                updateSample.mutateAsync(value).then(() =>
                  publishSample.mutate(
                    { id: sampleId, status: publishStatus },
                    {
                      onSuccess: () => navigate({ to: listRoute }),
                    },
                  ),
                ),
            },
      };

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{m.edit_sample_title()}</h1>
          {query.data.igsn ? (
            <p
              aria-label={m.field_igsn()}
              className="text-muted-foreground text-sm"
            >
              {query.data.igsn}
            </p>
          ) : null}
          {query.data.internalNumber === null ? null : (
            <p
              aria-label={m.field_internal_id()}
              className="text-muted-foreground text-sm"
            >
              {formatInternalId(query.data.internalNumber)}
            </p>
          )}
          {publicHint ? (
            <p role="status" className="text-muted-foreground text-sm">
              {publicHint}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isTombstone ? null : <ShareSampleButton sampleId={sampleId} />}
          <SampleActionsMenu
            sampleId={sampleId}
            sampleName={query.data.name}
            canDuplicate={canDuplicateSample(query.data)}
            canAddSubSample={canDeclareSubSample(query.data, { role, managed })}
            canDelete={canDeleteSample(query.data.role, query.data)}
            canRequestDeletion={
              me.data != null &&
              canRequestSampleDeletion(query.data.role, query.data, me.data)
            }
            isDeleteDisabled={deleteSample.isPending || heldByOther != null}
            templateInitialValues={
              canCreateImportTemplate(query.data)
                ? templateCustomizationOfSample(query.data)
                : undefined
            }
            onDelete={() =>
              deleteSample.mutate(undefined, {
                onSuccess: () =>
                  void navigate({ to: listRoute, ignoreBlocker: true }),
              })
            }
          />
        </div>
      </div>

      {lockedMessage ? (
        <div role="status">
          <Alert role="none" variant="info">
            <InfoIcon />
            <AlertDescription>{lockedMessage}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {status === "publish_failed" && query.data.publishingError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {m.sample_publish_failed_alert({
              error: query.data.publishingError,
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      {rejection ? (
        <Alert variant="destructive">
          <AlertDescription>{rejection}</AlertDescription>
        </Alert>
      ) : null}

      <SampleForm
        currentUser={me.data}
        defaultValues={query.data}
        manualGroupOptions={query.data.manualGroupOptions}
        parents={query.data.parents}
        fieldSuggestions={
          parents.length > 1 ? parentFieldSuggestions(parents) : undefined
        }
        sampleId={query.data.id}
        attachments={query.data.attachments}
        attachmentChanges={attachmentChanges}
        isPending={isPending}
        status={status}
        defaultTab={tab}
        onTabChange={(next) =>
          navigate({
            search: (prev) => ({ ...prev, tab: next }),
            replace: true,
          })
        }
        onCancel={() => navigate({ to: listRoute })}
        {...formActions}
      />
    </>
  );
}
