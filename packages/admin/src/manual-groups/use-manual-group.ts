import { manualGroupResponseSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useManualGroup(groupId: string, enabled = true) {
  const apiFetch = useApiClient();
  return useQuery({
    enabled,
    queryKey: ["manual-groups", groupId],
    queryFn: async () => {
      const { data } = await apiJson(
        apiFetch,
        new URL(`admin/manual-groups/${groupId}`, API_URL),
        manualGroupResponseSchema,
        "Failed to load the manual group",
      );
      return data;
    },
  });
}
