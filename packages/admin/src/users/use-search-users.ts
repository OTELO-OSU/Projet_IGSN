import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserIdentitiesResponse } from "@projet-igsn/domain/user/user-validator";

import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export const MIN_SEARCH_LENGTH = 2;

export function useSearchUsers(
  search: string,
  excludeCollaboratorsOf?: string,
  {
    enabled = true,
    ids,
    status,
    excludeMembersOf,
    includeSelf,
  }: {
    enabled?: boolean;
    ids?: string[];
    status?: UserStatus;
    excludeMembersOf?: string;
    includeSelf?: boolean;
  } = {},
) {
  const apiFetch = useApiClient();
  const term = search.length >= MIN_SEARCH_LENGTH ? search : "";
  const searchedIds = ids && [...ids].sort();
  return useQuery({
    enabled,
    queryKey: [
      "users",
      term,
      excludeCollaboratorsOf,
      status,
      excludeMembersOf,
      searchedIds,
      includeSelf,
    ],
    queryFn: async () => {
      const url = new URL("admin/users/search", API_URL);
      if (term !== "") {
        url.searchParams.set("search", term);
      }
      if (searchedIds !== undefined) {
        url.searchParams.set("ids", searchedIds.join(","));
      }
      if (excludeCollaboratorsOf !== undefined) {
        url.searchParams.set("excludeCollaboratorsOf", excludeCollaboratorsOf);
      }
      if (status !== undefined) {
        url.searchParams.set("status", status);
      }
      if (excludeMembersOf !== undefined) {
        url.searchParams.set("excludeMembersOf", excludeMembersOf);
      }
      if (includeSelf) {
        url.searchParams.set("includeSelf", "true");
      }
      const res = await apiFetch(url);
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to search researchers (${res.status})`,
        );
      }
      return ((await res.json()) as UserIdentitiesResponse).data;
    },
  });
}
