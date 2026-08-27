import { facetParamKeys } from "@projet-igsn/domain/sample/search/facets";
import { createFileRoute, redirect } from "@tanstack/react-router";

import type {
  ListSamplesParams,
  SampleFilters,
} from "#/domain/samples/client/list-samples.ts";
import type { SearchParams } from "#/domain/samples/search-params.ts";

import {
  listManualGroupsQueryOptions,
  useListManualGroups,
} from "#/domain/manual-groups/hook/list-manual-groups.ts";
import {
  listSamplesQueryOptions,
  useListSamples,
} from "#/domain/samples/hook/list-samples.ts";
import { SampleFacets } from "#/domain/samples/sample-facets.tsx";
import { SearchBanner } from "#/domain/samples/search-banner.tsx";
import { SearchCompose } from "#/domain/samples/search-compose.tsx";
import {
  clearDependents,
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
import { m } from "#/paraglide/messages.js";

const FACET_KEYS = facetParamKeys();

export const Route = createFileRoute("/search")({
  validateSearch: searchParamsSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const params = searchQueryParams(deps);
    if (!params) throw redirect({ to: "/" });
    return Promise.all([
      context.queryClient.ensureQueryData(listSamplesQueryOptions(params)),
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
                search: (prev) => {
                  const next = { ...prev } as Record<string, unknown>;
                  for (const key of FACET_KEYS) delete next[key];
                  next.page = 1;
                  return next as SearchParams;
                },
              })
            }
          />
          {params ? <Results params={params} /> : null}
        </div>
      </div>
    </div>
  );
}

function Results({ params }: { params: ListSamplesParams }) {
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
      emptyMessage={
        params.bbox && !params.search
          ? m.search_location_empty_hint()
          : m.search_no_results()
      }
      onPageChange={(next) =>
        navigate({ search: (prev) => ({ ...prev, page: next }) })
      }
      onPerPageChange={(perPage) =>
        navigate({ search: (prev) => ({ ...prev, perPage, page: 1 }) })
      }
      onFieldsChange={saveFields}
    />
  );
}
