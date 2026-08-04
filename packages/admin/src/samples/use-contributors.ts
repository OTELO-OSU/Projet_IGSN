import { listUsersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useContributors(sampleId: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["samples", sampleId, "contributors"],
    queryFn: async () => {
      const res = await apiFetch(
        new URL(`admin/samples/${sampleId}/contributors`, API_URL),
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load contributors (${res.status})`,
        );
      }
      return listUsersResponseSchema.parse(await res.json()).data;
    },
  });
}
