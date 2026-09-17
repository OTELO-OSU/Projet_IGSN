import { eligibleParentsResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { MIN_SEARCH_LENGTH } from "#/search-picker/use-picker.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useSearchEligibleParents(
  search: string,
  exclude: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const apiFetch = useApiClient();
  const term = search.length >= MIN_SEARCH_LENGTH ? search : "";
  return useQuery({
    enabled,
    queryKey: ["samples", "eligible-parents", term, exclude],
    queryFn: async () => {
      const url = new URL("admin/samples/parents", API_URL);
      if (term !== "") {
        url.searchParams.set("search", term);
      }
      if (exclude !== undefined) {
        url.searchParams.set("exclude", exclude);
      }
      const { data } = await apiJson(
        apiFetch,
        url,
        eligibleParentsResponseSchema,
        "Failed to search eligible parents",
      );
      return data;
    },
  });
}
