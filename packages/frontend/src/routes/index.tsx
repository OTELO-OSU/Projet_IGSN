import { Button } from "@projet-igsn/design-system/components/ui/button";
import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { listSamplesQuerySchema } from "@projet-igsn/domain/sample/sample-validator";
import { createFileRoute } from "@tanstack/react-router";

import {
  listSamplesQueryOptions,
  useListSamples,
} from "#/domain/samples/hook/list-samples.ts";
import { SampleList } from "#/domain/samples/sample-list.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/")({
  validateSearch: listSamplesQuerySchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(listSamplesQueryOptions(deps)),
  component: Home,
});

function Home() {
  const { page, perPage, search } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useListSamples({ page, perPage, search });
  const pageCount = Math.max(1, Math.ceil(data.total / perPage));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-3xl font-bold text-sky-900">
        {m.samples_title()}
      </h1>
      <div className="mb-6">
        <SearchField
          defaultValue={search ?? ""}
          label={m.samples_search_label()}
          placeholder={m.samples_search_placeholder()}
          // New search resets to page 1; empty clears the URL param.
          onSearch={(value) =>
            navigate({
              search: { page: 1, perPage, search: value || undefined },
            })
          }
        />
      </div>
      <SampleList samples={data.data} />

      <nav
        aria-label={m.pagination_label()}
        className="mt-8 flex items-center justify-center gap-4"
      >
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => navigate({ search: { page: page - 1, perPage } })}
        >
          {m.pagination_previous()}
        </Button>
        <span aria-live="polite">
          {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => navigate({ search: { page: page + 1, perPage } })}
        >
          {m.pagination_next()}
        </Button>
      </nav>
    </div>
  );
}
