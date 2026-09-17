import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  getSampleByIgsnQueryOptions,
  useGetSampleByIgsn,
} from "#/domain/samples/hook/get-sample-by-igsn.ts";
import {
  getSampleLineageQueryOptions,
  useGetSampleLineage,
} from "#/domain/samples/hook/get-sample-lineage.ts";
import { SampleView } from "#/domain/samples/sample-view.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/samples/$igsn")({
  loader: async ({ context, params }) => {
    const [sample] = await Promise.all([
      context.queryClient.ensureQueryData(
        getSampleByIgsnQueryOptions(params.igsn),
      ),
      context.queryClient.ensureQueryData(
        getSampleLineageQueryOptions(params.igsn),
      ),
    ]);
    if (!sample) {
      throw notFound();
    }
    return { title: sample.name, withdrawn: sample.status === "withdrawn" };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.title ?? m.app_title() },
      ...(loaderData?.withdrawn
        ? [{ name: "robots", content: "noindex" }]
        : []),
    ],
  }),
  component: SampleDetail,
});

function SampleDetail() {
  const { igsn } = Route.useParams();
  const { data: sample } = useGetSampleByIgsn(igsn);
  const { data: lineage } = useGetSampleLineage(igsn);
  if (!sample) {
    return null;
  }

  return <SampleView sample={sample} lineage={lineage} />;
}
