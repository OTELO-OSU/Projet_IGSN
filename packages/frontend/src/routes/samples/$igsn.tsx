import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  getSampleByIgsnQueryOptions,
  useGetSampleByIgsn,
} from "#/domain/samples/hook/get-sample-by-igsn.ts";
import { SampleView } from "#/domain/samples/sample-view.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/samples/$igsn")({
  loader: async ({ context, params }) => {
    const sample = await context.queryClient.ensureQueryData(
      getSampleByIgsnQueryOptions(params.igsn),
    );
    if (!sample) {
      throw notFound();
    }
    return { title: sample.name };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title ?? m.app_title() }],
  }),
  component: SampleDetail,
});

function SampleDetail() {
  const { igsn } = Route.useParams();
  const { data: sample } = useGetSampleByIgsn(igsn);
  // The loader throws notFound() on a missing sample, so it is never null here.
  if (!sample) {
    return null;
  }

  return (
    <SampleView
      name={sample.name}
      igsn={sample.igsn}
      nature={sample.nature}
      type={sample.type}
      material={sample.material}
      texture={sample.texture}
      metamorphicFacies={sample.metamorphicFacies}
      collectionMethod={sample.collectionMethod}
      collectionMethodDescription={sample.collectionMethodDescription}
      description={sample.description}
      location={sample.location}
      age={sample.age}
    />
  );
}
