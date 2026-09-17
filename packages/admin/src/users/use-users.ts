import type { ListUsersQuery } from "@projet-igsn/domain/user/user-validator";

import { listUsersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
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

      const { data, meta } = await apiJson(
        apiFetch,
        url,
        listUsersResponseSchema,
        "Failed to load users",
      );
      return { data, total: meta.total };
    },
    placeholderData: keepPreviousData,
  });
}
