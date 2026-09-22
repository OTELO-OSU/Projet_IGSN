import { myManualGroupsResponseSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useMyManualGroups(enabled = true) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["currentUser", "manual-groups"],
    queryFn: async () => {
      return apiJson(
        apiFetch,
        new URL("admin/currentUser/manual-groups", API_URL),
        myManualGroupsResponseSchema,
        "Failed to load your manual groups",
      );
    },
    enabled,
  });
}
