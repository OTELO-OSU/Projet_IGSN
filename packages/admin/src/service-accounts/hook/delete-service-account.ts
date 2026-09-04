import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { m } from "#/paraglide/messages.js";
import { deleteServiceAccount } from "#/service-accounts/client/delete-service-account.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useDeleteServiceAccount(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteServiceAccount(apiFetch, id),
    onSuccess: () => {
      toast.success(m.service_account_deleted());
      return queryClient.invalidateQueries({ queryKey: ["service-accounts"] });
    },
    onError: () => toast.error(m.service_account_delete_error()),
  });
}
