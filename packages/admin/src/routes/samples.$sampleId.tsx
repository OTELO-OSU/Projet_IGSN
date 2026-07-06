import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { PublishSampleButton } from "#/samples/publish-sample-button.tsx";
import { SampleForm } from "#/samples/sample-form.tsx";
import { usePublishSample } from "#/samples/use-publish-sample.ts";
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
  const publishSample = usePublishSample(sampleId);
  const [formValues, setFormValues] = useState<{
    name: string;
    nature: string;
  } | null>(null);

  if (query.isPending) {
    return <p>{m.samples_loading()}</p>;
  }
  if (query.isError) {
    return <p role="alert">{m.samples_error()}</p>;
  }
  if (!query.data) {
    return <p role="alert">{m.sample_not_found()}</p>;
  }

  // Unsaved edits gate Publish; a saved form (query.data refetched after
  // update) or a reverted edit re-enables it.
  const hasUnsavedChanges =
    formValues !== null &&
    (formValues.name !== query.data.name ||
      formValues.nature !== query.data.nature);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{m.edit_sample_title()}</h1>
        {query.data.published ? null : (
          <PublishSampleButton
            disabled={
              hasUnsavedChanges ||
              updateSample.isPending ||
              publishSample.isPending
            }
            onPublish={() =>
              publishSample.mutate(undefined, {
                onSuccess: () => navigate({ to: "/" }),
              })
            }
          />
        )}
      </div>

      {updateSample.isError ? (
        <p role="alert">{m.edit_sample_error()}</p>
      ) : null}
      {publishSample.isError ? (
        <p role="alert">{m.publish_sample_error()}</p>
      ) : null}

      <SampleForm
        defaultValues={{ name: query.data.name, nature: query.data.nature }}
        igsn={query.data.igsn}
        published={query.data.published}
        submitLabel={m.action_save()}
        isPending={updateSample.isPending || publishSample.isPending}
        onCancel={() => navigate({ to: "/" })}
        onSubmit={(value) => updateSample.mutate(value)}
        onValuesChange={setFormValues}
      />
    </>
  );
}
