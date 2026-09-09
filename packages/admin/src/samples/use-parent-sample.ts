import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { queryOptions, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function parentSampleQueryOptions(
  apiFetch: ReturnType<typeof useApiClient>,
  id: string | undefined,
) {
  return queryOptions({
    queryKey: ["samples", "parents", id],
    queryFn: async () => {
      const res = await apiFetch(
        new URL(`admin/samples/parents/${id}`, API_URL),
      );
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load parent sample (${res.status})`,
        );
      }
      return sampleResponseSchema.parse(await res.json()).data;
    },
    enabled: id !== undefined,
  });
}

export function useParentSample(id: string | undefined) {
  return useQuery(parentSampleQueryOptions(useApiClient(), id));
}
