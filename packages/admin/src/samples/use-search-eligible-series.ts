import { eligibleParentsResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { MIN_SEARCH_LENGTH } from "#/search-picker/use-picker.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useSearchEligibleSeries(
  search: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const apiFetch = useApiClient();
  const term = search.length >= MIN_SEARCH_LENGTH ? search : "";
  return useQuery({
    enabled,
    queryKey: ["samples", "eligible-series", term],
    queryFn: async () => {
      const url = new URL("admin/samples/series", API_URL);
      if (term !== "") {
        url.searchParams.set("search", term);
      }
      const { data } = await apiJson(
        apiFetch,
        url,
        eligibleParentsResponseSchema,
        "Failed to search eligible series",
      );
      return data;
    },
  });
}
