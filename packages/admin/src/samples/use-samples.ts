import { listSamplesResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useSamples(params: {
  page: number;
  perPage: number;
  sort?: "status";
  order?: "asc" | "desc";
  search?: string;
}) {
  const apiFetch = useApiClient();
  return useQuery({
    // params carries search, so the query refetches when the search changes.
    queryKey: ["samples", params],
    queryFn: async () => {
      const url = new URL("admin/samples", API_URL);
      url.searchParams.set("page", String(params.page));
      url.searchParams.set("perPage", String(params.perPage));
      if (params.sort) {
        url.searchParams.set("sort", params.sort);
        url.searchParams.set("order", params.order ?? "asc");
      }
      if (params.search) url.searchParams.set("search", params.search);

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
