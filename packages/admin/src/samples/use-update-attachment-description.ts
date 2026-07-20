import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useUpdateAttachmentDescription(sampleId: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      attachmentId: string;
      description: string | null;
    }) => {
      const res = await apiFetch(
        new URL(
          `admin/samples/${sampleId}/attachments/${input.attachmentId}`,
          API_URL,
        ),
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ description: input.description }),
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to update attachment (${res.status})`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["samples"] }),
    onError: () => toast.error(m.attachment_description_error()),
  });
}
