import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

const SUCCESS_MESSAGE: Record<SetSampleStatusBody["status"], () => string> = {
  published: m.republish_sample_success,
  withdrawn: m.withdraw_sample_success,
  tombstone: m.tombstone_sample_success,
};

export function useSetSampleStatus(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: SetSampleStatusBody["status"]) => {
      const res = await apiFetch(
        new URL(`admin/samples/${id}/status`, API_URL),
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to set sample status (${res.status})`);
      }
      return sampleResponseSchema.parse(await res.json()).data;
    },
    onSuccess: (_sample, status) => {
      toast.success(SUCCESS_MESSAGE[status]());
      return queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
    onError: () => toast.error(m.set_sample_status_error()),
  });
}
