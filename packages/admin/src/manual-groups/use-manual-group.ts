import { manualGroupResponseSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useManualGroup(groupId: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["manual-groups", groupId],
    queryFn: async () => {
      const res = await apiFetch(
        new URL(`admin/manual-groups/${groupId}`, API_URL),
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load the manual group (${res.status})`,
        );
      }
      return manualGroupResponseSchema.parse(await res.json()).data;
    },
  });
}
