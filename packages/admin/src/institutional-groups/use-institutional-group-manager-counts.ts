import { institutionalGroupCountsResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useInstitutionalGroupManagerCounts() {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["institutional-group-manager-counts"],
    queryFn: async () => {
      const { data } = await apiJson(
        apiFetch,
        new URL("admin/institutional-groups/manager-counts", API_URL),
        institutionalGroupCountsResponseSchema,
        "Failed to load the institutional group manager counts",
      );
      return data;
    },
  });
}
