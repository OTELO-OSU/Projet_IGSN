import { queryOptions, useQuery } from "@tanstack/react-query";

import { listPublicUsers } from "#/domain/users/client/list-public-users.ts";

export function listPublicUsersQueryOptions(include?: string) {
  return queryOptions({
    queryKey: ["users", include],
    queryFn: () => listPublicUsers(include),
    // The key changes with the picked contributor; keep each list fresh long
    // enough that the loader's fetch serves the hook and the way back.
    staleTime: 5 * 60_000,
  });
}

export function useListPublicUsers(include?: string) {
  return useQuery(listPublicUsersQueryOptions(include));
}
