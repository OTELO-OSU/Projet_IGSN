import { manualGroupsResponseSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useAttachableManualGroups() {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["currentUser", "attachable-manual-groups"],
    queryFn: async () => {
      const res = await apiFetch(
        new URL("admin/currentUser/attachable-manual-groups", API_URL),
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load your manual groups (${res.status})`,
        );
      }
      return manualGroupsResponseSchema.parse(await res.json());
    },
  });
}
