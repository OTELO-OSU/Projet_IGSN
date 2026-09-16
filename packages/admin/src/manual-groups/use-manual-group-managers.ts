import { groupManagersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useManualGroupManagers(groupId: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["manual-groups", groupId, "managers"],
    queryFn: async () => {
      const { data } = await apiJson(
        apiFetch,
        new URL(`admin/manual-groups/${groupId}/managers`, API_URL),
        groupManagersResponseSchema,
        "Failed to load the manual group managers",
      );
      return data;
    },
  });
}
