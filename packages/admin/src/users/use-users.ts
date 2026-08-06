import type { ListUsersQuery } from "@projet-igsn/domain/user/user-validator";

import { listUsersResponseSchema } from "@projet-igsn/domain/user/user-validator";
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
      url.searchParams.set("page", String(params.page));
      url.searchParams.set("perPage", String(params.perPage));
      if (params.status) url.searchParams.set("status", params.status);

      const res = await apiFetch(url);
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load users (${res.status})`,
        );
      }
      const { data, meta } = listUsersResponseSchema.parse(await res.json());
      return { data, total: meta.total };
    },
    placeholderData: keepPreviousData,
  });
}
