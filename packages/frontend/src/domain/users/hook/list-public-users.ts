import { queryOptions, useQuery } from "@tanstack/react-query";

import { listPublicUsers } from "#/domain/users/client/list-public-users.ts";

export function listPublicUsersQueryOptions(include?: string) {
  return queryOptions({
    queryKey: ["users", include],
    queryFn: () => listPublicUsers(include),
    staleTime: 5 * 60_000,
  });
}

export function useListPublicUsers(include?: string) {
  return useQuery(listPublicUsersQueryOptions(include));
}
