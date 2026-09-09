import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { m } from "#/paraglide/messages.js";
import { rotateApiKey } from "#/service-accounts/client/rotate-api-key.ts";
import { MY_SERVICE_ACCOUNTS_KEY } from "#/service-accounts/hook/list-my-service-accounts.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useRotateApiKey() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rotateApiKey(apiFetch, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: MY_SERVICE_ACCOUNTS_KEY }),
    onError: () => toast.error(m.service_account_api_key_error()),
  });
}
