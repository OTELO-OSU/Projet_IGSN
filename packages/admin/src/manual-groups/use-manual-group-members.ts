import { manualGroupMembersResponseSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useManualGroupMembers(groupId: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["manual-groups", groupId, "members"],
    queryFn: async () => {
      const { data } = await apiJson(
        apiFetch,
        new URL(`admin/manual-groups/${groupId}/members`, API_URL),
        manualGroupMembersResponseSchema,
        "Failed to load the manual group members",
      );
      return data;
    },
  });
}
