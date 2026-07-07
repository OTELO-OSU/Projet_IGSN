import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useUpdateSample(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSample) => {
      const res = await apiFetch(new URL(`admin/samples/${id}`, API_URL), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new Error(`Failed to update sample (${res.status})`);
      }
      return sampleResponseSchema.parse(await res.json()).data;
    },
    onSuccess: () => {
      toast.success(m.edit_sample_success());
      // Prefix match: refreshes both the list and this sample's detail query.
      return queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
    onError: () => toast.error(m.edit_sample_error()),
  });
}
