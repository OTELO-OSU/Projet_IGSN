import type { ListSamplesQuery } from "@projet-igsn/domain/sample/sample-validator";

import { adminListSamplesResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
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
>;

const OPTIONAL_PARAMS = [
  "search",
  "ownership",
  "ownerId",
  "institution",
  "manualGroup",
] as const;

export function useSamples(params: SampleListParams, moderated = false) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["samples", { moderated, ...params }],
    queryFn: async () => {
      const url = new URL(
        moderated ? "admin/samples/moderated" : "admin/samples",
        API_URL,
      );
      url.searchParams.set("page", String(params.page));
      url.searchParams.set("perPage", String(params.perPage));
      if (params.sort) {
        url.searchParams.set("sort", params.sort);
        url.searchParams.set("order", params.order ?? "asc");
      }
      for (const key of OPTIONAL_PARAMS) {
        const value = params[key];
        if (value) url.searchParams.set(key, value);
      }

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
