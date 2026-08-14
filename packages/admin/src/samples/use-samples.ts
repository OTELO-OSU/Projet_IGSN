import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import { adminListSamplesResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useSamples(
  params: Pick<
    ListSamplesQuery,
    "page" | "perPage" | "sort" | "order" | "search" | "ownership"
  >,
) {
  const apiFetch = useApiClient();
  return useQuery({
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
      if (params.ownership) url.searchParams.set("ownership", params.ownership);

      const res = await apiFetch(url);
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load samples (${res.status})`,
        );
      }
      const { data, meta } = adminListSamplesResponseSchema.parse(
        await res.json(),
      );
      return { data, total: meta.total };
    },
    placeholderData: keepPreviousData,
  });
}
