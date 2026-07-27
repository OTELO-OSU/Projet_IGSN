import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
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
import { LazyLocationMap } from "#/domain/samples/lazy-location-map.tsx";
import { SampleFacets } from "#/domain/samples/sample-facets.tsx";
import { SearchBanner } from "#/domain/samples/search-banner.tsx";
import {
  PER_PAGE,
  isLocationSearchActive,
  locationSearch,
  nextEngineSearch,
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
  const shrunk = isLocationSearchActive(search);
  // Undefined means there is nothing to search yet (empty text with no facet, or
  // location without a box), so no results block and no query.
  const params = searchQueryParams(search);

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
            onSearch={(bbox) =>
              navigate({ search: locationSearch(bbox, search) })
            }
          />
        )}
      </SearchBanner>

      <div className="relative mx-auto w-full max-w-6xl px-6 py-8">
        {/* The sidebar is always up, on both engines: facets refine a box search
            the same way they refine a text one. Gating it on active filters made
            "Clear all filters" hide the only way back to them. */}
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
          {/* Nothing to search (including right after an engine switch, which
              drops the other engine's param): ask for a search in the results
              column rather than leaving it blank or showing stale results. */}
          {params ? (
            <Results search={search} params={params} />
          ) : (
            <p className="text-muted-foreground text-center">
              {search.engine === "text"
                ? m.search_empty_hint()
                : m.search_location_hint()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Rendered only with a runnable query (`params`), so the list never runs on an
// empty search. Both engines share it: they differ only in the copy shown when
// nothing matches.
function Results({
  search,
  params,
}: {
  search: SearchParams;
  params: ListSamplesParams;
}) {
  const navigate = Route.useNavigate();
  const { data } = useListSamples(params);
  const pageCount = Math.max(1, Math.ceil(data.total / PER_PAGE));

  return (
    <SearchResultsView
      samples={data.data}
      total={data.total}
      query={search.q}
      page={search.page}
      pageCount={pageCount}
      emptyMessage={
        search.engine === "location"
          ? m.search_location_empty_hint()
          : undefined
      }
      onPageChange={(next) =>
        navigate({ search: (prev) => ({ ...prev, page: next }) })
      }
    />
  );
}
