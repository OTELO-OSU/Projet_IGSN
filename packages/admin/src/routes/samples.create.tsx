import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { m } from "#/paraglide/messages.js";
import { SampleForm } from "#/samples/sample-form.tsx";
import { useCreateSample } from "#/samples/use-create-sample.ts";

export const Route = createFileRoute("/samples/create")({
  component: CreateSamplePage,
});

function CreateSamplePage() {
  const navigate = useNavigate();
  const createSample = useCreateSample();

  return (
    <>
      <h1 className="text-2xl font-bold">{m.create_sample_title()}</h1>

      <SampleForm
        isPending={createSample.isPending}
        onCancel={() => navigate({ to: "/" })}
        primaryAction={{
          kind: "submit",
          label: m.action_create(),
          onSubmit: (value) =>
            createSample.mutate(value, {
              onSuccess: (sample) =>
                navigate({
                  to: "/samples/$sampleId",
                  params: { sampleId: sample.id },
                }),
            }),
        }}
      />
    </>
  );
}
