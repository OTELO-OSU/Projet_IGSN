import { queryOptions, useQuery } from "@tanstack/react-query";

import { useApiClient } from "#/use-api-client.ts";
import { getInstitutionalGroupCounts } from "#/users/client/get-institutional-group-counts.ts";

export const getInstitutionalGroupCountsQueryOptions = (
  apiFetch: typeof fetch,
) =>
  queryOptions({
    queryKey: ["institutional-group-counts"],
    queryFn: () => getInstitutionalGroupCounts(apiFetch),
  });

export function useGetInstitutionalGroupCounts() {
  return useQuery(getInstitutionalGroupCountsQueryOptions(useApiClient()));
}
