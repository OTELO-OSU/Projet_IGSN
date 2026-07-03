import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { createSampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApiClient } from "#/use-api-client.ts";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002";

export function useCreateSample() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSample) => {
      const res = await apiFetch(new URL("samples", API_URL), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new Error(`Failed to create sample (${res.status})`);
      }
      return createSampleResponseSchema.parse(await res.json()).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["samples"] }),
  });
}
