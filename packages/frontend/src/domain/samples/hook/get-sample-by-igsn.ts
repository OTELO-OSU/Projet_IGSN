import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { getSampleByIgsn } from "#/domain/samples/client/get-sample-by-igsn.ts";

// Shared between the route loader (SSR prefetch) and the hook so both read the
// same cache entry. Loaders need the options object; components use the hook.
export function getSampleByIgsnQueryOptions(igsn: string) {
  return queryOptions({
    queryKey: ["sample", igsn],
    queryFn: () => getSampleByIgsn(igsn),
  });
}

export function useGetSampleByIgsn(igsn: string) {
  return useSuspenseQuery(getSampleByIgsnQueryOptions(igsn));
}
