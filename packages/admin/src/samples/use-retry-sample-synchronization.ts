import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useRetrySampleSynchronization(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const url = new URL(`admin/samples/${id}/retry-synchronization`, API_URL);
      const res = await apiFetch(url, { method: "POST" });
      if (!res.ok) {
        console.error(
          `Failed to retry the sample synchronization (${res.status})`,
        );
        toast.error(m.retry_synchronization_error());
        return;
      }
      toast.success(m.retry_sample_synchronization_success());
      await queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
    onError: () => toast.error(m.retry_synchronization_error()),
  });
}
