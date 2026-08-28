import { institutionalGroupCountsResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useInstitutionalGroupManagerCounts() {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["institutional-group-manager-counts"],
    queryFn: async () => {
      const res = await apiFetch(
        new URL("admin/institutional-groups/manager-counts", API_URL),
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load the institutional group manager counts (${res.status})`,
        );
      }
      return institutionalGroupCountsResponseSchema.parse(await res.json())
        .data;
    },
  });
}
