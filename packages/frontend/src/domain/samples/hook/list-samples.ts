import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import {
  type ListSamplesParams,
  listSamples,
} from "#/domain/samples/client/list-samples.ts";

// Shared between the route loader (SSR prefetch) and the hook so both read the
// same cache entry. Loaders need the options object; components use the hook.
export function listSamplesQueryOptions(params: ListSamplesParams) {
  return queryOptions({
    queryKey: ["samples", params],
    queryFn: () => listSamples(params),
  });
}

export function useListSamples(params: ListSamplesParams) {
  return useSuspenseQuery(listSamplesQueryOptions(params));
}
