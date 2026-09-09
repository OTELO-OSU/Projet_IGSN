import { sampleParentSchema } from "@projet-igsn/domain/sample/parent/model";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { useAttachableManualGroups } from "#/manual-groups/use-attachable-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { SampleForm } from "#/samples/sample-form.tsx";
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
  const me = useCurrentUser();
  const createSample = useCreateSample();
  const publishSample = usePublishSample();
  const attachableManualGroups = useAttachableManualGroups();
  const parentQuery = useParentSample(parentId);

  if (parentId !== undefined && parentQuery.isPending) {
    return <p>{m.samples_loading()}</p>;
  }
  const parent = parentQuery.data ?? undefined;

  return (
    <>
      <h1 className="text-2xl font-bold">
        {parent
          ? m.create_sub_sample_title({ name: parent.name })
          : m.create_sample_title()}
      </h1>

      <SampleForm
        currentUser={me.data}
        defaultValues={parent ? toSubSampleDefaults(parent) : undefined}
        parent={parent && sampleParentSchema.parse(parent)}
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
