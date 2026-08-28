import type { RequestSampleDeletionBody } from "@projet-igsn/domain/sample/sample-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useRequestSampleDeletion(sampleId: string) {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async (body: RequestSampleDeletionBody) => {
      const res = await apiFetch(
        new URL(`admin/samples/${sampleId}/deletion-request`, API_URL),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to request the deletion (${res.status})`);
      }
    },
    onSuccess: () => toast.success(m.sample_deletion_request_sent()),
    onError: () => toast.error(m.sample_deletion_request_error()),
  });
}
