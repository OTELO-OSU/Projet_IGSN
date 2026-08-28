import { createFileRoute, notFound } from "@tanstack/react-router";

import {
  getSampleByIgsnQueryOptions,
  useGetSampleByIgsn,
} from "#/domain/samples/hook/get-sample-by-igsn.ts";
import { SampleView } from "#/domain/samples/sample-view.tsx";
import { WithdrawnSampleView } from "#/domain/samples/withdrawn-sample-view.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/samples/$igsn")({
  loader: async ({ context, params }) => {
    const sample = await context.queryClient.ensureQueryData(
      getSampleByIgsnQueryOptions(params.igsn),
    );
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
  if (!sample) {
    return null;
  }

  return sample.status === "withdrawn" ? (
    <WithdrawnSampleView sample={sample} />
  ) : (
    <SampleView sample={sample} />
  );
}
