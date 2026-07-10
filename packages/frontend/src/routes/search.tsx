import { Button } from "@projet-igsn/design-system/components/ui/button";
import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  listSamplesQueryOptions,
  useListSamples,
} from "#/domain/samples/hook/list-samples.ts";
import { SampleList } from "#/domain/samples/sample-list.tsx";
import { m } from "#/paraglide/messages.js";

const PER_PAGE = 50;

// Frontend-only URL state: the query is `q`, pagination is `page`. Page size is
// fixed at 50, so it is not a URL param.
const searchParamsSchema = z.object({
  q: z.string().trim().min(1).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchParamsSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    // No query means no search: nothing to prefetch.
    if (!deps.q) {
      return;
    }
    return context.queryClient.ensureQueryData(
      listSamplesQueryOptions({
        page: deps.page,
        perPage: PER_PAGE,
        search: deps.q,
      }),
    );
  },
  component: SearchPage,
});

function SearchPage() {
  const { q, page } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div>
      <div className="bg-sky-700 text-white">
        <div className="mx-auto max-w-3xl px-6 py-12 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {m.search_results_title()}
          </h1>
          <div className="text-foreground mt-6 text-left">
            <SearchField
              searchOnType={false}
              defaultValue={q ?? ""}
              label={m.samples_search_label()}
              placeholder={m.search_placeholder()}
              buttonLabel={m.search_action()}
              // New search resets to page 1; empty clears the URL param.
              onSearch={(value) =>
                navigate({ search: { q: value || undefined, page: 1 } })
              }
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {q ? (
          <SearchResults query={q} page={page} />
        ) : (
          <p className="text-muted-foreground text-center">
            {m.search_empty_hint()}
          </p>
        )}
      </div>
    </div>
  );
}

// Rendered only when there is a query, so the list query never runs on an empty
// search.
function SearchResults({ query, page }: { query: string; page: number }) {
  const navigate = Route.useNavigate();
  const { data } = useListSamples({ page, perPage: PER_PAGE, search: query });
  const pageCount = Math.max(1, Math.ceil(data.total / PER_PAGE));

  return (
    <>
      <p className="text-muted-foreground mb-6">
        {m.search_results_count({ count: data.total })}
      </p>
      <SampleList samples={data.data} query={query} />

      {pageCount > 1 ? (
        <nav
          aria-label={m.pagination_label()}
          className="mt-8 flex items-center justify-center gap-4"
        >
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => navigate({ search: { q: query, page: page - 1 } })}
          >
            {m.pagination_previous()}
          </Button>
          <span aria-live="polite">
            {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => navigate({ search: { q: query, page: page + 1 } })}
          >
            {m.pagination_next()}
          </Button>
        </nav>
      ) : null}
    </>
  );
}
