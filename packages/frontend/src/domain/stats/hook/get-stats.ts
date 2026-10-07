import { queryOptions, useQuery } from "@tanstack/react-query";

import { getStats } from "#/domain/stats/client/get-stats.ts";

export function getStatsQueryOptions() {
  return queryOptions({
    queryKey: ["stats"],
    queryFn: () => getStats(),
    staleTime: 5 * 60_000,
  });
}

export function useGetStats() {
  return useQuery(getStatsQueryOptions());
}
