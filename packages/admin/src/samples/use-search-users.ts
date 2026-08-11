import { userIdentitiesResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export const MIN_SEARCH_LENGTH = 2;

export function useSearchUsers(
  search: string,
  excludeCollaboratorsOf: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const apiFetch = useApiClient();
  const term = search.length >= MIN_SEARCH_LENGTH ? search : "";
  return useQuery({
    enabled,
    queryKey: ["users", term, excludeCollaboratorsOf],
    queryFn: async () => {
      const url = new URL("admin/users/search", API_URL);
      if (term !== "") {
        url.searchParams.set("search", term);
      }
      url.searchParams.set("excludeCollaboratorsOf", excludeCollaboratorsOf);
      const res = await apiFetch(url);
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to search researchers (${res.status})`,
        );
      }
      return userIdentitiesResponseSchema.parse(await res.json()).data;
    },
  });
}
