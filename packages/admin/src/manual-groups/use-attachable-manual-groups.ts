import { manualGroupsResponseSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useAttachableManualGroups() {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["currentUser", "attachable-manual-groups"],
    queryFn: async () => {
      return apiJson(
        apiFetch,
        new URL("admin/currentUser/attachable-manual-groups", API_URL),
        manualGroupsResponseSchema,
        "Failed to load your manual groups",
      );
    },
  });
}
