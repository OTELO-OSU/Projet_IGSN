import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "#/use-api-client.ts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002";

export function usePublishSample(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(new URL(`samples/${id}/publish`, API_URL), {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`Failed to publish sample (${res.status})`);
      }
      return sampleResponseSchema.parse(await res.json()).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["samples"] }),
  });
}
