import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, useState } from "react";

import {
  listSamplesQueryOptions,
  useListSamples,
} from "#/domain/samples/hook/list-samples.ts";
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

// Leaflet touches `window` at module scope, so it must never be in the server
// import graph. Lazy + a client-only mount gate keeps the whole module (and its
// CSS) off the SSR path; the rest of /search still server-renders.
const SearchLocationMap = lazy(() =>
  import("#/domain/samples/search-location-map.tsx").then((module) => ({
    default: module.SearchLocationMap,
  })),
);

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
  // Gate the leaflet map on hydration: the lazy import must fire only on the
  // client, never during server render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
            // New search resets to page 1; empty clears the URL param.
            onSearch={(value) =>
              navigate({
                search: { engine: "text", q: value || undefined, page: 1 },
              })
            }
          />
        ) : mounted ? (
          <Suspense fallback={null}>
            <SearchLocationMap
              initialBbox={search.bbox}
              compact={shrunk}
              onSearch={(bbox) => navigate({ search: locationSearch(bbox) })}
            />
          </Suspense>
        ) : null}
      </SearchBanner>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {search.engine === "text" ? (
          search.q ? (
            <TextResults query={search.q} page={search.page} />
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

// Rendered only when there is a query, so the list query never runs on an empty
// search.
function TextResults({ query, page }: { query: string; page: number }) {
  const navigate = Route.useNavigate();
  const { data } = useListSamples({ page, perPage: PER_PAGE, search: query });
  const pageCount = Math.max(1, Math.ceil(data.total / PER_PAGE));

  return (
    <SearchResultsView
      samples={data.data}
      total={data.total}
      query={query}
      page={page}
      pageCount={pageCount}
      onPageChange={(next) =>
        navigate({ search: { engine: "text", q: query, page: next } })
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
