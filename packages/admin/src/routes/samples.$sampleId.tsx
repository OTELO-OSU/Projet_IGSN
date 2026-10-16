import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";
import { useQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { m } from "#/paraglide/messages.js";
import { EditSampleForm } from "#/samples/edit-sample-form.tsx";
import { sampleFormTabSchema } from "#/samples/sample-form-tabs.ts";
import { useAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import { useDeleteSample } from "#/samples/use-delete-sample.ts";
import { parentSampleQueryOptions } from "#/samples/use-parent-sample.ts";
import { usePublishSample } from "#/samples/use-publish-sample.ts";
import { useSampleEditLock } from "#/samples/use-sample-edit-lock.ts";
import { ForbiddenError, useSample } from "#/samples/use-sample.ts";
import { useSetSampleStatus } from "#/samples/use-set-sample-status.ts";
import { useUpdateSample } from "#/samples/use-update-sample.ts";
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
