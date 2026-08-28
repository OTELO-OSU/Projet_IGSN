import type {
  ListManualGroupsQuery,
  ListManualGroupsResponse,
} from "@projet-igsn/domain/manual-group/manual-group-validator";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useManualGroups(params: ListManualGroupsQuery, enabled = true) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["manual-groups", params],
    queryFn: async () => {
      const url = new URL("admin/manual-groups", API_URL);
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }

      const res = await apiFetch(url);
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load manual groups (${res.status})`,
        );
      }
      const { data, meta } = (await res.json()) as ListManualGroupsResponse;
      return { data, total: meta.total };
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}
