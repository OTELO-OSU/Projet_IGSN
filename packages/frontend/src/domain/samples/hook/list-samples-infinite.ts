import { DEFAULT_PAGE_SIZE } from "@projet-igsn/domain/sample/sample-validator";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import {
  type SearchFilters,
  listSamples,
} from "#/domain/samples/client/list-samples.ts";

export function useListSamplesInfinite(filters: SearchFilters) {
  return useInfiniteQuery({
    queryKey: ["samples", "infinite", filters],
    queryFn: ({ pageParam }) =>
      listSamples({ ...filters, page: pageParam, perPage: DEFAULT_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.length * DEFAULT_PAGE_SIZE < last.total
        ? pages.length + 1
        : undefined,
    placeholderData: keepPreviousData,
  });
}
