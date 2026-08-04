import { listUsersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export const MIN_SEARCH_LENGTH = 2;

export function useSearchUsers(search: string) {
  const apiFetch = useApiClient();
  const term = search.length >= MIN_SEARCH_LENGTH ? search : "";
  return useQuery({
    queryKey: ["users", term],
    queryFn: async () => {
      const url = new URL("admin/users", API_URL);
      if (term !== "") {
        url.searchParams.set("search", term);
      }
      const res = await apiFetch(url);
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to search researchers (${res.status})`,
        );
      }
      return listUsersResponseSchema.parse(await res.json()).data;
    },
  });
}
