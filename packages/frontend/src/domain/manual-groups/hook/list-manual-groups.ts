import { queryOptions, useQuery } from "@tanstack/react-query";

import { listManualGroups } from "#/domain/manual-groups/client/list-manual-groups.ts";

export function listManualGroupsQueryOptions() {
  return queryOptions({
    queryKey: ["manual-groups"],
    queryFn: () => listManualGroups(),
  });
}

export function useListManualGroups() {
  return useQuery(listManualGroupsQueryOptions());
}
