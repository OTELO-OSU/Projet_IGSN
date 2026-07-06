import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useQuery } from "@tanstack/react-query";

import { useApiClient } from "#/use-api-client.ts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002";

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
