import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useCurrentUser } from "#/auth/use-current-user.ts";
import { useAttachableManualGroups } from "#/manual-groups/use-attachable-manual-groups.ts";
import { m } from "#/paraglide/messages.js";
import { SampleForm } from "#/samples/sample-form.tsx";
import { useCreateSample } from "#/samples/use-create-sample.ts";
import { usePublishSample } from "#/samples/use-publish-sample.ts";

export const Route = createFileRoute("/samples/create")({
  component: CreateSamplePage,
});

function CreateSamplePage() {
  const navigate = useNavigate();
  const me = useCurrentUser();
  const createSample = useCreateSample();
  const publishSample = usePublishSample();
  const attachableManualGroups = useAttachableManualGroups();

  return (
    <>
      <h1 className="text-2xl font-bold">{m.create_sample_title()}</h1>

      <SampleForm
        currentUser={me.data}
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
