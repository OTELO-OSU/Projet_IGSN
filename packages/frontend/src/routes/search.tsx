import { Button } from "@projet-igsn/design-system/components/ui/button";
import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import {
  activeFacetKeys,
  facetParamKeys,
  facetQueryFields,
} from "@projet-igsn/domain/sample/search/facets";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import type { SampleFilters } from "#/domain/samples/client/list-samples.ts";

import {
  listSamplesQueryOptions,
  useListSamples,
} from "#/domain/samples/hook/list-samples.ts";
import { SampleFacets } from "#/domain/samples/sample-facets.tsx";
import { SampleList } from "#/domain/samples/sample-list.tsx";
import { m } from "#/paraglide/messages.js";

const PER_PAGE = 50;

// Frontend URL state: the query is `q`, pagination is `page`, and one param per
// facet (from the registry, so the URL schema matches the API). Page size is
// fixed at 50, so it is not a URL param.
const searchParamsSchema = z.object({
  q: z.string().trim().min(1).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  ...facetQueryFields(),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

const FACET_KEYS = facetParamKeys();

// The facet params as an API filter bag: every active facet param, keyed by
// name. A range unit alone (no bound) is not active, so it is never sent.
function toFilters(search: SearchParams): SampleFilters {
  const filters: SampleFilters = {};
  const record = search as Record<string, string | number | undefined>;
  for (const key of activeFacetKeys(record)) filters[key] = record[key];
  return filters;
}

// Results (and the facet sidebar) show once there is a text query or any facet.
function hasActiveFilters(search: SearchParams): boolean {
  return Boolean(search.q) || activeFacetKeys(search).length > 0;
}

export const Route = createFileRoute("/search")({
  validateSearch: searchParamsSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    if (!hasActiveFilters(deps)) return;
    return context.queryClient.ensureQueryData(
      listSamplesQueryOptions({
        page: deps.page,
        perPage: PER_PAGE,
        search: deps.q,
        filters: toFilters(deps),
      }),
    );
  },
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <>
      <div className="flex h-40 flex-col items-center justify-center gap-4 bg-sky-700 px-6 text-white sm:top-24 sm:h-40">
        <div className="mx-auto w-full max-w-6xl text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">
            {m.search_results_title()}
          </h1>
          <div className="text-foreground mt-6 text-left">
            <SearchField
              searchOnType={false}
              defaultValue={search.q ?? ""}
              label={m.samples_search_label()}
              placeholder={m.search_placeholder()}
              buttonLabel={m.search_action()}
              // New search resets to page 1; empty clears the query, keeping facets.
              onSearch={(value) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    q: value || undefined,
                    page: 1,
                  }),
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-8">
        {hasActiveFilters(search) ? (
          <div className="relative grid gap-8 md:grid-cols-[24rem_1fr]">
            <SampleFacets
              values={search as SampleFilters}
              onChange={(key, value) =>
                navigate({
                  resetScroll: false,
                  search: (prev) => ({ ...prev, [key]: value, page: 1 }),
                })
              }
              onClearAll={() =>
                navigate({
                  resetScroll: false,
                  search: (prev) => {
                    const next = { ...prev } as Record<string, unknown>;
                    for (const key of FACET_KEYS) delete next[key];
                    next.page = 1;
                    return next as SearchParams;
                  },
                })
              }
            />
            <SearchResults search={search} />
          </div>
        ) : (
          <p className="text-muted-foreground text-center">
            {m.search_empty_hint()}
          </p>
        )}
      </div>
    </>
  );
}

function SearchResults({ search }: { search: SearchParams }) {
  const navigate = Route.useNavigate();
  const { data } = useListSamples({
    page: search.page,
    perPage: PER_PAGE,
    search: search.q,
    filters: toFilters(search),
  });
  const pageCount = Math.max(1, Math.ceil(data.total / PER_PAGE));

  return (
    <div>
      <p className="text-muted-foreground mb-6">
        {m.search_results_count({ count: data.total })}
      </p>
      <SampleList samples={data.data} query={search.q ?? ""} />

      {pageCount > 1 ? (
        <nav
          aria-label={m.pagination_label()}
          className="mt-8 flex items-center justify-center gap-4"
        >
          <Button
            variant="outline"
            disabled={search.page <= 1}
            onClick={() =>
              navigate({
                search: (prev) => ({ ...prev, page: search.page - 1 }),
              })
            }
          >
            {m.pagination_previous()}
          </Button>
          <span aria-live="polite">
            {search.page} / {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={search.page >= pageCount}
            onClick={() =>
              navigate({
                search: (prev) => ({ ...prev, page: search.page + 1 }),
              })
            }
          >
            {m.pagination_next()}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
