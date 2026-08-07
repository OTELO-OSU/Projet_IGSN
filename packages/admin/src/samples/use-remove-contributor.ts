import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useRemoveContributor(sampleId: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiFetch(
        new URL(`admin/samples/${sampleId}/collaborators/${userId}`, API_URL),
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw new Error(`Failed to remove the contributor (${res.status})`);
      }
    },
    onSuccess: () => {
      toast.success(m.share_contributor_removed());
      return queryClient.invalidateQueries({
        queryKey: ["samples", sampleId, "collaborators"],
      });
    },
    onError: () => toast.error(m.share_contributor_remove_error()),
  });
}
