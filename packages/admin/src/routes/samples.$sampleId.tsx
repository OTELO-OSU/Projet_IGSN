import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { m } from "#/paraglide/messages.js";
import { SampleForm } from "#/samples/sample-form.tsx";
import { useSample } from "#/samples/use-sample.ts";
import { useUpdateSample } from "#/samples/use-update-sample.ts";

export const Route = createFileRoute("/samples/$sampleId")({
  component: EditSamplePage,
});

function EditSamplePage() {
  const { sampleId } = Route.useParams();
  const navigate = useNavigate();
  const query = useSample(sampleId);
  const updateSample = useUpdateSample(sampleId);

  if (query.isPending) {
    return <p>{m.samples_loading()}</p>;
  }
  if (query.isError) {
    return <p role="alert">{m.samples_error()}</p>;
  }
  if (!query.data) {
    return <p role="alert">{m.sample_not_found()}</p>;
  }

  return (
    <>
      <h1 className="text-2xl font-bold">{m.edit_sample_title()}</h1>

      {updateSample.isError ? (
        <p role="alert">{m.edit_sample_error()}</p>
      ) : null}

      <SampleForm
        defaultValues={{ name: query.data.name, nature: query.data.nature }}
        submitLabel={m.action_save()}
        isPending={updateSample.isPending}
        onCancel={() => navigate({ to: "/" })}
        onSubmit={(value) =>
          updateSample.mutate(value, {
            onSuccess: () => navigate({ to: "/" }),
          })
        }
      />
    </>
  );
}
