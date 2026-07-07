import { createFileRoute } from "@tanstack/react-router";

import {
  listSamplesQueryOptions,
  useListSamples,
} from "#/domain/samples/hook/list-samples.ts";
import { SampleList } from "#/domain/samples/sample-list.tsx";
import { m } from "#/paraglide/messages.js";

const listParams = { page: 1, perPage: 25 };

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(listSamplesQueryOptions(listParams)),
  component: Home,
});

function Home() {
  const { data } = useListSamples(listParams);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-3xl font-bold text-sky-900">
        {m.samples_title()}
      </h1>
      <SampleList samples={data.data} />
    </div>
  );
}
