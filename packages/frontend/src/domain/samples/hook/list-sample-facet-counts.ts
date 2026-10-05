import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";

import { listSampleFacetCounts } from "#/domain/samples/client/list-sample-facet-counts.ts";

export function listSampleFacetCountsQueryOptions({
  search,
  filters,
  bbox,
}: SearchFilters) {
  const params = { search, filters, bbox };
  return queryOptions({
    queryKey: ["sample-facet-counts", params],
    queryFn: () => listSampleFacetCounts(params),
    placeholderData: keepPreviousData,
  });
}

export function useListSampleFacetCounts(params: SearchFilters) {
  return useQuery(listSampleFacetCountsQueryOptions(params));
}
