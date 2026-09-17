import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiOk, HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useDeleteSample(sampleId: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiOk(
        apiFetch,
        new URL(`admin/samples/${sampleId}`, API_URL),
        "Failed to delete the sample",
        { method: "DELETE" },
      );
    },
    onSuccess: () => {
      toast.success(m.sample_deleted());
      void queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 409
          ? m.sample_delete_locked()
          : m.sample_delete_error(),
      ),
  });
}
