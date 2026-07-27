import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { facetParamKeys } from "@projet-igsn/domain/sample/search/facets";
import { createFileRoute } from "@tanstack/react-router";

import type { SampleFilters } from "#/domain/samples/client/list-samples.ts";
import type { SearchParams } from "#/domain/samples/search-params.ts";

import {
  listSamplesQueryOptions,
  useListSamples,
} from "#/domain/samples/hook/list-samples.ts";
import { LazyLocationMap } from "#/domain/samples/lazy-location-map.tsx";
import { SampleFacets } from "#/domain/samples/sample-facets.tsx";
import { SearchBanner } from "#/domain/samples/search-banner.tsx";
import {
  PER_PAGE,
  hasActiveFilters,
  isLocationSearchActive,
  locationSearch,
  nextEngineSearch,
  searchParamsSchema,
  searchQueryParams,
  toFilters,
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
  const shrunk = isLocationSearchActive(search);

  return (
    <div>
      <SearchBanner
        shrunk={shrunk}
        engine={search.engine}
        onEngineChange={(engine) =>
          navigate({ search: nextEngineSearch(search, engine) })
        }
      >
        {search.engine === "text" ? (
          <SearchField
            searchOnType={false}
            defaultValue={search.q ?? ""}
            label={m.samples_search_label()}
            placeholder={m.search_placeholder()}
            buttonLabel={m.search_action()}
            // New search resets to page 1; empty clears the query, keeping facets.
            onSearch={(value) =>
              navigate({
                search: (prev) => ({ ...prev, q: value || undefined, page: 1 }),
              })
            }
          />
        ) : (
          <LazyLocationMap
            initialBbox={search.bbox}
            compact={shrunk}
            onSearch={(bbox) => navigate({ search: locationSearch(bbox) })}
          />
        )}
      </SearchBanner>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-8">
        {search.engine === "text" ? (
          hasActiveFilters(search) ? (
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
              <TextResults search={search} />
            </div>
          ) : (
            <p className="text-muted-foreground text-center">
              {m.search_empty_hint()}
            </p>
          )
        ) : shrunk ? (
          <LocationResults bbox={search.bbox!} page={search.page} />
        ) : null}
      </div>
    </div>
  );
}

// Rendered only when a query or a facet is set, so the list query never runs on
// an empty search.
function TextResults({ search }: { search: SearchParams }) {
  const navigate = Route.useNavigate();
  const { data } = useListSamples({
    page: search.page,
    perPage: PER_PAGE,
    search: search.q,
    filters: toFilters(search),
  });
  const pageCount = Math.max(1, Math.ceil(data.total / PER_PAGE));

  return (
    <SearchResultsView
      samples={data.data}
      total={data.total}
      query={search.q}
      page={search.page}
      pageCount={pageCount}
      onPageChange={(next) =>
        navigate({ search: (prev) => ({ ...prev, page: next }) })
      }
    />
  );
}

// Rendered only when a valid box is active, so the list query always has a box.
function LocationResults({ bbox, page }: { bbox: string; page: number }) {
  const navigate = Route.useNavigate();
  const { data } = useListSamples({ page, perPage: PER_PAGE, bbox });
  const pageCount = Math.max(1, Math.ceil(data.total / PER_PAGE));

  return (
    <SearchResultsView
      samples={data.data}
      total={data.total}
      page={page}
      pageCount={pageCount}
      emptyMessage={m.search_location_empty_hint()}
      onPageChange={(next) =>
        navigate({ search: { engine: "location", bbox, page: next } })
      }
    />
  );
}
