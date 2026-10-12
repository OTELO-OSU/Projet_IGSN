import type { ReactNode } from "react";

import { createFileRoute, redirect } from "@tanstack/react-router";

import type {
  ListSamplesParams,
  SampleFilters,
} from "#/domain/samples/client/list-samples.ts";

import {
  listManualGroupsQueryOptions,
  useListManualGroups,
} from "#/domain/manual-groups/hook/list-manual-groups.ts";
import { useListSampleFacetCounts } from "#/domain/samples/hook/list-sample-facet-counts.ts";
import {
  listSamplesQueryOptions,
  useListSamples,
} from "#/domain/samples/hook/list-samples.ts";
import { OpenDataLink } from "#/domain/samples/open-data-link.tsx";
import {
  ResultsMapButton,
  ResultsMapDialog,
} from "#/domain/samples/results-map-dialog.tsx";
import { SampleFacets } from "#/domain/samples/sample-facets.tsx";
import { SearchBanner } from "#/domain/samples/search-banner.tsx";
import { SearchCompose } from "#/domain/samples/search-compose.tsx";
import { searchEmptyMessage } from "#/domain/samples/search-empty-message.ts";
import {
  clearDependents,
  clearFacets,
  composeSeedFromParams,
  searchParamsSchema,
  searchQueryParams,
} from "#/domain/samples/search-params.ts";
import { SearchResultsView } from "#/domain/samples/search-results-view.tsx";
import { useCardFields } from "#/domain/samples/use-card-fields.ts";
import {
  listPublicUsersQueryOptions,
  useListPublicUsers,
} from "#/domain/users/hook/list-public-users.ts";

export const Route = createFileRoute("/search")({
  validateSearch: searchParamsSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const params = searchQueryParams(deps);
    if (!params) throw redirect({ to: "/" });
    return Promise.all([
      deps.map
        ? undefined
        : context.queryClient.ensureQueryData(listSamplesQueryOptions(params)),
      context.queryClient.ensureQueryData(listManualGroupsQueryOptions()),
      context.queryClient.ensureQueryData(
        listPublicUsersQueryOptions(deps.contributor),
      ),
    ]);
  },
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const seed = composeSeedFromParams(search);
  const params = searchQueryParams(search);
  const { data: manualGroups } = useListManualGroups();
  const { data: contributors } = useListPublicUsers(search.contributor);
  const setMap = (open: boolean) =>
    navigate({
      resetScroll: false,
      search: (prev) => ({ ...prev, map: open ? true : undefined }),
    });
  const { data: counts } = useListSampleFacetCounts(params ?? {});

  return (
    <div>
      <SearchBanner>
        <SearchCompose
          key={JSON.stringify([search.q, search.bbox])}
          initialActive={seed.active}
          initialDrafts={seed.drafts}
          shrunk
          onSearch={(next) =>
            navigate({
              search: (prev) => ({
                ...prev,
                ...clearFacets(),
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
        <div className="relative grid gap-8 md:grid-cols-[24rem_1fr]">
          <SampleFacets
            values={search as SampleFilters}
            manualGroups={manualGroups}
            contributors={contributors}
            counts={counts}
            onChange={(key, value) =>
              navigate({
                resetScroll: false,
                search: (prev) => ({
                  ...prev,
                  [key]: value,
                  ...clearDependents(key),
                  page: 1,
                }),
              })
            }
            onClearAll={() =>
              navigate({
                resetScroll: false,
                search: (prev) => ({ ...prev, ...clearFacets(), page: 1 }),
              })
            }
          />
          {params && !search.map ? (
            <Results
              params={params}
              actions={
                <>
                  <OpenDataLink />
                  <ResultsMapButton onClick={() => setMap(true)} />
                </>
              }
            />
          ) : null}
          {params ? (
            <ResultsMapDialog
              open={!!search.map}
              onOpenChange={setMap}
              params={params}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Results({
  params,
  actions,
}: {
  params: ListSamplesParams;
  actions?: ReactNode;
}) {
  const navigate = Route.useNavigate();
  const { data } = useListSamples(params);
  const { fields, saveFields } = useCardFields();
  const pageCount = Math.max(1, Math.ceil(data.total / params.perPage));

  return (
    <SearchResultsView
      samples={data.data}
      total={data.total}
      query={params.search}
      page={params.page}
      pageCount={pageCount}
      perPage={params.perPage}
      fields={fields}
      emptyMessage={searchEmptyMessage(params)}
      onPageChange={(next) =>
        navigate({ search: (prev) => ({ ...prev, page: next }) })
      }
      onPerPageChange={(perPage) =>
        navigate({ search: (prev) => ({ ...prev, perPage, page: 1 }) })
      }
      onFieldsChange={saveFields}
      actions={actions}
    />
  );
}
