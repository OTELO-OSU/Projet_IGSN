import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { retryPublicationResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useRetryPublication() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const url = new URL("admin/samples/retry-publication", API_URL);
      const res = await apiFetch(url, { method: "POST" });
      if (!res.ok) {
        throw new Error(`Failed to retry publication (${res.status})`);
      }
      return retryPublicationResponseSchema.parse(await res.json());
    },
    onSuccess: ({ count }) => {
      toast.success(m.retry_publication_success({ count }));
      return queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
    onError: () => toast.error(m.retry_publication_error()),
  });
}
