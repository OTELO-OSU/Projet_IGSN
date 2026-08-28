import type { ManualGroupMembersResponse } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useManualGroupMembers(groupId: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["manual-groups", groupId, "members"],
    queryFn: async () => {
      const res = await apiFetch(
        new URL(`admin/manual-groups/${groupId}/members`, API_URL),
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load the manual group members (${res.status})`,
        );
      }
      return ((await res.json()) as ManualGroupMembersResponse).data;
    },
  });
}
