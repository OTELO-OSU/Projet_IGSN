import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
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
import { activeFacetCount } from "#/domain/samples/active-facet-count.ts";
import { DownloadResultsLink } from "#/domain/samples/download-results-link.tsx";
import { FacetsDialog } from "#/domain/samples/facets-dialog.tsx";
import { FacetsPane } from "#/domain/samples/facets-pane.tsx";
import { useListSampleFacetCounts } from "#/domain/samples/hook/list-sample-facet-counts.ts";
import {
  listSamplesQueryOptions,
  useListSamples,
} from "#/domain/samples/hook/list-samples.ts";
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
import { useSampleSelection } from "#/domain/samples/use-sample-selection.ts";
import { useStoredFlag } from "#/domain/samples/use-stored-flag.ts";
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

const FACETS_COLLAPSED_KEY = "search-facets-collapsed";

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const seed = composeSeedFromParams(search);
  const params = searchQueryParams(search);
  const [selection, setSelection] = useSampleSelection(search);
  const [isFacetsCollapsed, saveFacetsCollapsed] =
    useStoredFlag(FACETS_COLLAPSED_KEY);
  const { data: manualGroups } = useListManualGroups();
  const { data: contributors } = useListPublicUsers(search.contributor);
  const setMap = (open: boolean) =>
    navigate({
      resetScroll: false,
      search: (prev) => ({ ...prev, map: open ? true : undefined }),
    });
  const { data: counts } = useListSampleFacetCounts(params ?? {});
  const renderFacets = (header?: ReactNode) => (
    <SampleFacets
      header={header}
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
  );

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
        <FacetsPane
          isCollapsed={isFacetsCollapsed}
          count={activeFacetCount(search)}
          onCollapsedChange={saveFacetsCollapsed}
          facets={renderFacets}
        >
          {params && !search.map ? (
            <Results
              params={params}
              selection={selection}
              onSelectionChange={setSelection}
              actions={<ResultsMapButton onClick={() => setMap(true)} />}
            />
          ) : null}
          {params ? (
            <ResultsMapDialog
              open={!!search.map}
              onOpenChange={setMap}
              params={params}
            />
          ) : null}
        </FacetsPane>
      </div>
      <FacetsDialog values={search}>{renderFacets()}</FacetsDialog>
    </div>
  );
}

function Results({
  params,
  selection,
  onSelectionChange,
  actions,
}: {
  params: ListSamplesParams;
  selection: RowSelectionState;
  onSelectionChange: OnChangeFn<RowSelectionState>;
  actions?: ReactNode;
}) {
  const navigate = Route.useNavigate();
  const { data } = useListSamples(params);
  const { fields, saveFields } = useCardFields();
  const total = data.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / params.perPage));

  return (
    <SearchResultsView
      samples={data.data}
      total={total}
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
      selection={selection}
      onSelectionChange={onSelectionChange}
      download={
        <DownloadResultsLink
          filters={params}
          total={total}
          selected={Object.keys(selection)}
        />
      }
      actions={actions}
    />
  );
}
