import type { PublishStatus } from "@projet-igsn/domain/sample/sample-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

const SUCCESS_MESSAGE: Record<PublishStatus, () => string> = {
  published: m.publish_sample_success,
  withdrawn: m.publish_withdrawn_sample_success,
  embargo: m.publish_embargo_sample_success,
};

export function usePublishSample() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      publishedAt,
    }: {
      id: string;
      status: PublishStatus;
      publishedAt?: string;
    }) => {
      const url = new URL(`admin/samples/${id}/publish`, API_URL);
      url.searchParams.set("status", status);
      if (publishedAt) url.searchParams.set("publishedAt", publishedAt);
      const res = await apiFetch(url, { method: "POST" });
      if (!res.ok) {
        throw new Error(`Failed to publish sample (${res.status})`);
      }
      return sampleResponseSchema.parse(await res.json()).data;
    },
    onSuccess: (_sample, { status }) => {
      toast.success(SUCCESS_MESSAGE[status]());
      return queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
    onError: () => toast.error(m.publish_sample_error()),
  });
}
