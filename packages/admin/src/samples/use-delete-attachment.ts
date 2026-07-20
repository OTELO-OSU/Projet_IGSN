import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useDeleteAttachment(sampleId: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await apiFetch(
        new URL(
          `admin/samples/${sampleId}/attachments/${attachmentId}`,
          API_URL,
        ),
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw new Error(`Failed to delete attachment (${res.status})`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["samples"] }),
    onError: () => toast.error(m.attachment_delete_error()),
  });
}
