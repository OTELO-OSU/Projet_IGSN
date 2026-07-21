import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { FRONTEND_URL } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";
import { SampleForm } from "#/samples/sample-form.tsx";
import { useAttachmentChanges } from "#/samples/use-attachment-changes.ts";
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
  // Lives here, not in the (unmounting) Links tab, so staged files survive
  // tab switches; the form uploads them on submit.
  const attachmentChanges = useAttachmentChanges(sampleId);

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
          material: query.data.material,
          texture: query.data.texture,
          metamorphicFacies: query.data.metamorphicFacies,
          collectionMethod: query.data.collectionMethod,
          collectionMethodDescription: query.data.collectionMethodDescription,
          specificName: query.data.specificName,
          location: query.data.location,
          description: query.data.description,
          condition: query.data.condition,
          security: query.data.security,
          availability: query.data.availability,
          age: query.data.age,
          links: query.data.links,
          economicInterest: query.data.economicInterest,
          economicInterestElements: query.data.economicInterestElements,
          economicResourceTypePrecision:
            query.data.economicResourceTypePrecision,
          economicDepositName: query.data.economicDepositName,
          economicDepositDescription: query.data.economicDepositDescription,
        }}
        sampleId={query.data.id}
        attachments={query.data.attachments}
        attachmentChanges={attachmentChanges}
        isPending={isPending}
        published={isPublished}
        onCancel={() => navigate({ to: "/" })}
        secondaryAction={{
          kind: "submit",
          label: isPublished
            ? m.action_publish_updates()
            : m.action_save_draft(),
          onSubmit: (value) => updateSample.mutate(value),
        }}
        primaryAction={
          isPublished && query.data.igsn
            ? {
                kind: "link",
                label: m.action_view_public_page(),
                href: `${FRONTEND_URL}/samples/${query.data.igsn}`,
              }
            : {
                kind: "publish",
                label: m.action_save_publish(),
                // Draft: save the edits, publish, then return to the list.
                onPublish: (value) =>
                  updateSample.mutate(value, {
                    onSuccess: () =>
                      publishSample.mutate(undefined, {
                        onSuccess: () => navigate({ to: "/" }),
                      }),
                  }),
              }
        }
      />
    </>
  );
}
