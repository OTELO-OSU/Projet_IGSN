import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { sampleParentSchema } from "@projet-igsn/domain/sample/parent/model";
import { useQueries } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { useAttachableManualGroups } from "#/manual-groups/use-attachable-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { parentFieldSuggestions } from "#/samples/parent-field-suggestions.ts";
import { SampleForm } from "#/samples/sample-form.tsx";
import { SecondParentDialog } from "#/samples/second-parent-dialog.tsx";
import { toDuplicateDefaults } from "#/samples/to-duplicate-defaults.ts";
import { toSubSampleDefaults } from "#/samples/to-sub-sample-defaults.ts";
import { useCreateSample } from "#/samples/use-create-sample.ts";
import {
  parentSampleQueryOptions,
  useParentSample,
} from "#/samples/use-parent-sample.ts";
import { usePublishSample } from "#/samples/use-publish-sample.ts";
import { ForbiddenError, useSample } from "#/samples/use-sample.ts";
import { useApiClient } from "#/use-api-client.ts";

export const Route = createFileRoute("/samples/create")({
  validateSearch: z.object({
    parent: z.uuid().optional().catch(undefined),
    duplicate: z.uuid().optional().catch(undefined),
  }),
  component: CreateSamplePage,
});

function CreateSamplePage() {
  const navigate = useNavigate();
  const { parent: parentId, duplicate: duplicateId } = Route.useSearch();
  const [picked, setPicked] = useState<SampleParent | null | undefined>(
    undefined,
  );
  const me = useCurrentUser();
  const createSample = useCreateSample();
  const publishSample = usePublishSample();
  const attachableManualGroups = useAttachableManualGroups();
  const subSampleParentId = duplicateId === undefined ? parentId : undefined;
  const parentQuery = useParentSample(subSampleParentId);
  const secondParentQuery = useParentSample(picked?.id);
  const sourceQuery = useSample(duplicateId);
  const apiFetch = useApiClient();
  const sourceParentQueries = useQueries({
    queries: (sourceQuery.data?.parents ?? []).map(({ id }) =>
      parentSampleQueryOptions(apiFetch, id),
    ),
  });

  if (duplicateId !== undefined) {
    if (
      sourceQuery.isPending ||
      attachableManualGroups.isPending ||
      sourceParentQueries.some((query) => query.isPending)
    ) {
      return <p>{m.samples_loading()}</p>;
    }
    if (sourceQuery.isError || attachableManualGroups.isError) {
      return (
        <p role="alert">
          {sourceQuery.error instanceof ForbiddenError
            ? m.sample_forbidden()
            : m.samples_error()}
        </p>
      );
    }
    if (!sourceQuery.data) {
      return <p role="alert">{m.sample_not_found()}</p>;
    }
  }
  const source = sourceQuery.data ?? undefined;
  const sourceParents = sourceParentQueries
    .map((query) => query.data)
    .filter((parent) => parent != null);

  if (subSampleParentId !== undefined && parentQuery.isPending) {
    return <p>{m.samples_loading()}</p>;
  }
  const first = parentQuery.data ?? undefined;
  if (first && picked === undefined) {
    return (
      <SecondParentDialog
        firstParent={sampleParentSchema.parse(first)}
        onContinue={setPicked}
        onCancel={() => navigate({ to: "/" })}
      />
    );
  }
  if (picked != null && secondParentQuery.isPending) {
    return <p>{m.samples_loading()}</p>;
  }
  const second = secondParentQuery.data ?? undefined;
  const parents = [first, second].filter((parent) => parent !== undefined);
  const hasTwoParents = parents.length === 2;
  const manualGroupOptions = attachableManualGroups.data?.data ?? [];

  return (
    <>
      <h1 className="text-2xl font-bold">
        {source
          ? m.duplicate_sample_title({ name: source.name })
          : first && second
            ? m.create_sub_sample_of_two_title({
                first: first.name,
                second: second.name,
              })
            : first
              ? m.create_sub_sample_title({ name: first.name })
              : m.create_sample_title()}
      </h1>

      <SampleForm
        currentUser={me.data}
        defaultOperatorUserId={me.data?.id}
        defaultValues={
          source
            ? toDuplicateDefaults(
                source,
                manualGroupOptions.map(({ id }) => id),
                sourceParents.map(({ id }) => id),
              )
            : parents.length > 0
              ? toSubSampleDefaults(parents)
              : undefined
        }
        parents={(source ? sourceParents : parents).map((parent) =>
          sampleParentSchema.parse(parent),
        )}
        fieldSuggestions={
          hasTwoParents ? parentFieldSuggestions(parents) : undefined
        }
        isPending={createSample.isPending || publishSample.isPending}
        manualGroupOptions={manualGroupOptions}
        onCancel={() => navigate({ to: "/" })}
        secondaryAction={{
          kind: "submit",
          label: m.action_save(),
          onSubmit: (value) =>
            createSample.mutate(value, {
              onSuccess: (sample) =>
                navigate({
                  to: "/samples/$sampleId",
                  params: { sampleId: sample.id },
                }),
            }),
        }}
        primaryAction={{
          kind: "publish",
          label: m.action_publish(),
          disabled: me.isPending,
          onPublish: (value, status) =>
            createSample.mutate(value, {
              onSuccess: (sample) =>
                publishSample.mutate(
                  { id: sample.id, status },
                  {
                    onSuccess: () => navigate({ to: "/" }),
                    onError: () =>
                      navigate({
                        to: "/samples/$sampleId",
                        params: { sampleId: sample.id },
                      }),
                  },
                ),
            }),
        }}
      />
    </>
  );
}
