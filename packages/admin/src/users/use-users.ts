import type {
  ListUsersQuery,
  ListUsersResponse,
} from "@projet-igsn/domain/user/user-validator";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useUsers(params: ListUsersQuery) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const url = new URL("admin/users", API_URL);
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }

      const res = await apiFetch(url);
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load users (${res.status})`,
        );
      }
      const { data, meta } = (await res.json()) as ListUsersResponse;
      return { data, total: meta.total };
    },
    placeholderData: keepPreviousData,
  });
}
