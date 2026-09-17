import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiOk } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useDeleteServiceAccount(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiOk(
        apiFetch,
        new URL(`admin/service-accounts/${id}`, API_URL),
        "Failed to delete the service account",
        { method: "DELETE" },
      );
    },
    onSuccess: () => {
      toast.success(m.service_account_deleted());
      return queryClient.invalidateQueries({ queryKey: ["service-accounts"] });
    },
    onError: () => toast.error(m.service_account_delete_error()),
  });
}
