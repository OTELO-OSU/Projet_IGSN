import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { sampleParentSchema } from "@projet-igsn/domain/sample/parent/model";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { useAttachableManualGroups } from "#/manual-groups/use-attachable-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { parentFieldSuggestions } from "#/samples/parent-field-suggestions.ts";
import { SampleForm } from "#/samples/sample-form.tsx";
import { SecondParentDialog } from "#/samples/second-parent-dialog.tsx";
import { toSubSampleDefaults } from "#/samples/to-sub-sample-defaults.ts";
import { useCreateSample } from "#/samples/use-create-sample.ts";
import { useParentSample } from "#/samples/use-parent-sample.ts";
import { usePublishSample } from "#/samples/use-publish-sample.ts";

export const Route = createFileRoute("/samples/create")({
  validateSearch: z.object({
    parent: z.uuid().optional().catch(undefined),
  }),
  component: CreateSamplePage,
});

function CreateSamplePage() {
  const navigate = useNavigate();
  const { parent: parentId } = Route.useSearch();
  const [picked, setPicked] = useState<SampleParent | null | undefined>(
    undefined,
  );
  const me = useCurrentUser();
  const createSample = useCreateSample();
  const publishSample = usePublishSample();
  const attachableManualGroups = useAttachableManualGroups();
  const parentQuery = useParentSample(parentId);
  const secondParentQuery = useParentSample(picked?.id);

  if (parentId !== undefined && parentQuery.isPending) {
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

  return (
    <>
      <h1 className="text-2xl font-bold">
        {first && second
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
        defaultValues={
          parents.length > 0 ? toSubSampleDefaults(parents) : undefined
        }
        parents={parents.map((parent) => sampleParentSchema.parse(parent))}
        fieldSuggestions={
          hasTwoParents ? parentFieldSuggestions(parents) : undefined
        }
        isPending={createSample.isPending || publishSample.isPending}
        manualGroupOptions={attachableManualGroups.data?.data ?? []}
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
