import { institutionalGroupCountsResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useGetInstitutionalGroupCounts() {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["institutional-group-counts"],
    queryFn: async () => {
      const { data } = await apiJson(
        apiFetch,
        new URL("admin/users/institutional-counts", API_URL),
        institutionalGroupCountsResponseSchema,
        "Failed to load the institutional group member counts",
      );
      return data;
    },
  });
}
