import { groupManagersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useManualGroupManagers(groupId: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["manual-groups", groupId, "managers"],
    queryFn: async () => {
      const res = await apiFetch(
        new URL(`admin/manual-groups/${groupId}/managers`, API_URL),
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load the manual group managers (${res.status})`,
        );
      }
      return groupManagersResponseSchema.parse(await res.json()).data;
    },
  });
}
