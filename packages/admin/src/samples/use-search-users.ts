import { listUsersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

const MIN_SEARCH_LENGTH = 2;

export function useSearchUsers(search: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["users", search],
    queryFn: async () => {
      const url = new URL("admin/users", API_URL);
      url.searchParams.set("search", search);
      const res = await apiFetch(url);
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to search researchers (${res.status})`,
        );
      }
      return listUsersResponseSchema.parse(await res.json()).data;
    },
    enabled: search.length >= MIN_SEARCH_LENGTH,
  });
}
