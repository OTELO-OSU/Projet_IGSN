import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { m } from "#/paraglide/messages.js";
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

  if (query.isPending) {
    return <p>{m.samples_loading()}</p>;
  }
  if (query.isError) {
    return <p role="alert">{m.samples_error()}</p>;
  }
  if (!query.data) {
    return <p role="alert">{m.sample_not_found()}</p>;
  }

  const isPublished = query.data.published;
  const isPending = updateSample.isPending || publishSample.isPending;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">{m.edit_sample_title()}</h1>
        {isPublished && query.data.igsn ? (
          <p
            aria-label={m.field_igsn()}
            className="text-muted-foreground text-sm"
          >
            {query.data.igsn}
          </p>
        ) : null}
      </div>

      <SampleForm
        defaultValues={{
          name: query.data.name,
          nature: query.data.nature,
          type: query.data.type,
        }}
        igsn={query.data.igsn}
        published={isPublished}
        submitLabel={
          isPublished ? m.action_publish_updates() : m.action_save_draft()
        }
        isPending={isPending}
        onCancel={() => navigate({ to: "/" })}
        onSubmit={(value) => updateSample.mutate(value)}
        // Draft only: save the edits, then publish, then return to the list.
        onPublish={
          isPublished
            ? undefined
            : (value) =>
                updateSample.mutate(value, {
                  onSuccess: () =>
                    publishSample.mutate(undefined, {
                      onSuccess: () => navigate({ to: "/" }),
                    }),
                })
        }
      />
    </>
  );
}
