import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { getSampleByIgsn } from "#/domain/samples/client/get-sample-by-igsn.ts";

export function getSampleByIgsnQueryOptions(igsn: string) {
  return queryOptions({
    queryKey: ["sample", igsn],
    queryFn: () => getSampleByIgsn(igsn),
  });
}

export function useGetSampleByIgsn(igsn: string) {
  return useSuspenseQuery(getSampleByIgsnQueryOptions(igsn));
}
