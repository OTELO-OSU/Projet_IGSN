import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { useApiClient } from "#/use-api-client.ts";

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
