import {
  infiniteQueryOptions,
  queryOptions,
  useSuspenseQuery,
} from "@tanstack/react-query";

import {
  type ListSamplesParams,
  listSamples,
} from "#/domain/samples/client/list-samples.ts";

export function listSamplesQueryOptions(params: ListSamplesParams) {
  return queryOptions({
    queryKey: ["samples", params],
    queryFn: () => listSamples(params),
  });
}

export function listSamplePagesQueryOptions(
  params: Omit<ListSamplesParams, "page">,
) {
  return infiniteQueryOptions({
    queryKey: ["samples", "pages", params],
    queryFn: ({ pageParam }) => listSamples({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.data.length < params.perPage ? undefined : lastPageParam + 1,
  });
}

export function useListSamples(params: ListSamplesParams) {
  return useSuspenseQuery(listSamplesQueryOptions(params));
}
