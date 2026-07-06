import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useSample(id: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["samples", id],
    queryFn: async () => {
      const res = await apiFetch(new URL(`samples/${id}`, API_URL));
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error(`Failed to load sample (${res.status})`);
      }
      return sampleResponseSchema.parse(await res.json()).data;
    },
  });
}
