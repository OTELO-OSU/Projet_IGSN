import type {
  AdminListSamplesResponse,
  ListSamplesQuery,
} from "@projet-igsn/domain/sample/sample-validator";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export type SampleListParams = Pick<
  ListSamplesQuery,
  | "page"
  | "perPage"
  | "sort"
  | "order"
  | "search"
  | "ownership"
  | "ownerId"
  | "institution"
  | "manualGroup"
  | "nature"
  | "collectionMethod"
  | "status"
>;

export function useSamples(params: SampleListParams, moderated = false) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["samples", { moderated, ...params }],
    queryFn: async () => {
      const url = new URL(
        moderated ? "admin/samples/moderated" : "admin/samples",
        API_URL,
      );
      const { page, perPage, sort, order, ...filters } = params;
      url.searchParams.set("page", String(page));
      url.searchParams.set("perPage", String(perPage));
      if (sort) {
        url.searchParams.set("sort", sort);
        url.searchParams.set("order", order ?? "asc");
      }
      for (const [key, value] of Object.entries(filters)) {
        if (value) url.searchParams.set(key, String(value));
      }

      const res = await apiFetch(url);
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load samples (${res.status})`,
        );
      }
      // ponytail: the cast claims Date on createdAt/updatedAt where JSON carries a string, so a reader of those fields converts.
      const { data, meta } = (await res.json()) as AdminListSamplesResponse;
      return { data, total: meta.total };
    },
    placeholderData: keepPreviousData,
  });
}
