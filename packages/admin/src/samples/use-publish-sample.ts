import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function usePublishSample(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(
        new URL(`admin/samples/${id}/publish`, API_URL),
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to publish sample (${res.status})`);
      }
      return sampleResponseSchema.parse(await res.json()).data;
    },
    onSuccess: () => {
      toast.success(m.publish_sample_success());
      return queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
  });
}
