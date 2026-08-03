import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useAddContributor(sampleId: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiFetch(
        new URL(`admin/samples/${sampleId}/contributors`, API_URL),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to add the contributor (${res.status})`);
      }
    },
    onSuccess: () => {
      toast.success(m.share_contributor_added());
      return queryClient.invalidateQueries({
        queryKey: ["samples", sampleId, "contributors"],
      });
    },
    onError: () => toast.error(m.share_contributor_error()),
  });
}
