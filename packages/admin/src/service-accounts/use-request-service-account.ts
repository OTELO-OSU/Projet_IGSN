import type { ServiceAccountRequest } from "@projet-igsn/domain/service-account/service-account-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiOk } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useRequestServiceAccount(onSent: () => void) {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async (body: ServiceAccountRequest) => {
      await apiOk(
        apiFetch,
        new URL("admin/currentUser/service-accounts/requests", API_URL),
        "Failed to request a service account",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    },
    onSuccess: () => {
      toast.success(m.service_account_request_success());
      onSent();
    },
    onError: () => toast.error(m.service_account_request_error()),
  });
}
