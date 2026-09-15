import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { getSampleLineage } from "#/domain/samples/client/get-sample-lineage.ts";

export function getSampleLineageQueryOptions(igsn: string) {
  return queryOptions({
    queryKey: ["sample", igsn, "lineage"],
    queryFn: () => getSampleLineage(igsn),
  });
}

export function useGetSampleLineage(igsn: string) {
  return useSuspenseQuery(getSampleLineageQueryOptions(igsn));
}
