import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { apiKeyResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { MY_SERVICE_ACCOUNTS_KEY } from "#/service-accounts/use-list-my-service-accounts.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useRotateApiKey() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiJson(
        apiFetch,
        new URL(`admin/currentUser/service-accounts/${id}/api-key`, API_URL),
        apiKeyResponseSchema,
        "Failed to generate the API key",
        { method: "POST" },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: MY_SERVICE_ACCOUNTS_KEY }),
    onError: () => toast.error(m.service_account_api_key_error()),
  });
}
