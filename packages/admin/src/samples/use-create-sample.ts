import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { SampleResponse } from "@projet-igsn/domain/sample/sample-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useCreateSample() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSample) => {
      const res = await apiFetch(new URL("admin/samples", API_URL), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new Error(`Failed to create sample (${res.status})`);
      }
      return ((await res.json()) as SampleResponse).data;
    },
    onSuccess: () => {
      toast.success(m.create_sample_success());
      return queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
    onError: () => toast.error(m.create_sample_error()),
  });
}
