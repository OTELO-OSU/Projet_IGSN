import { queryOptions, useQuery } from "@tanstack/react-query";

import { listContributors } from "#/domain/users/client/list-contributors.ts";

export function listContributorsQueryOptions(include?: string) {
  return queryOptions({
    queryKey: ["users", include],
    queryFn: () => listContributors(include),
  });
}

export function useListContributors(include?: string) {
  return useQuery(listContributorsQueryOptions(include));
}
