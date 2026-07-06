import { listSamplesResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useSamples(params: { page: number; perPage: number }) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["samples", params],
    queryFn: async () => {
      const url = new URL("samples", API_URL);
      url.searchParams.set("page", String(params.page));
      url.searchParams.set("perPage", String(params.perPage));

      const res = await apiFetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load samples (${res.status})`);
      }
      const { data, meta } = listSamplesResponseSchema.parse(await res.json());
      return { data, total: meta.total };
    },
    // Keep the current page on screen while the next one loads so paging
    // doesn't flash "Loading..." and reset the pager to 1/1.
    placeholderData: keepPreviousData,
  });
}
