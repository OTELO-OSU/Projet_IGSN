import { facetParamKeys } from "@projet-igsn/domain/sample/search/facets";
import { createFileRoute } from "@tanstack/react-router";

import type {
  ListSamplesParams,
  SampleFilters,
} from "#/domain/samples/client/list-samples.ts";
import type { SearchParams } from "#/domain/samples/search-params.ts";

import {
  listSamplesQueryOptions,
  useListSamples,
} from "#/domain/samples/hook/list-samples.ts";
import { SampleFacets } from "#/domain/samples/sample-facets.tsx";
import { SearchBanner } from "#/domain/samples/search-banner.tsx";
import { SearchCompose } from "#/domain/samples/search-compose.tsx";
import {
  PER_PAGE,
  composeSeedFromParams,
  isSearchActive,
  searchParamsSchema,
  searchQueryParams,
} from "#/domain/samples/search-params.ts";
import { SearchResultsView } from "#/domain/samples/search-results-view.tsx";
import { m } from "#/paraglide/messages.js";

const FACET_KEYS = facetParamKeys();

export const Route = createFileRoute("/search")({
  validateSearch: searchParamsSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const params = searchQueryParams(deps);
    if (!params) return;
    return context.queryClient.ensureQueryData(listSamplesQueryOptions(params));
  },
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const seed = composeSeedFromParams(search);
  const shrunk = isSearchActive(search);
  const params = searchQueryParams(search);

  return (
    <div>
      <SearchBanner shrunk={shrunk}>
        {/* SearchCompose seeds once, so key by the URL to reseed it on history
            back/forward. JSON, not a template: "" must not read as undefined. */}
        <SearchCompose
          key={JSON.stringify([search.q, search.bbox, search.engine])}
          initialActive={seed.active}
          initialDrafts={seed.drafts}
          shrunk={shrunk}
          // Engine params only: a new query must not discard the facets.
          onSearch={(next) =>
            navigate({
              search: (prev) => ({
                ...prev,
                q: next.q,
                bbox: next.bbox,
                engine: next.engine,
                page: 1,
              }),
            })
          }
        />
      </SearchBanner>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-8">
        {/* Always up: gating it on active filters made "Clear all filters" hide
            the only way back to them. */}
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
          {params ? (
            <Results params={params} />
          ) : (
            <p className="text-muted-foreground text-center">
              {/* "Type a query" points at no field when only the map is open. */}
              {seed.active.includes("text")
                ? m.search_empty_hint()
                : m.search_location_hint()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Results({ params }: { params: ListSamplesParams }) {
  const navigate = Route.useNavigate();
  const { data } = useListSamples(params);
  const pageCount = Math.max(1, Math.ceil(data.total / PER_PAGE));

  return (
    <SearchResultsView
      samples={data.data}
      total={data.total}
      query={params.search}
      page={params.page}
      pageCount={pageCount}
      // Blaming the area while a query also narrows the set hides the likelier
      // miss, so only a box on its own gets that copy.
      emptyMessage={
        params.bbox && !params.search
          ? m.search_location_empty_hint()
          : undefined
      }
      onPageChange={(next) =>
        navigate({ search: (prev) => ({ ...prev, page: next }) })
      }
    />
  );
}
