import type { ServiceAccountRequest } from "@projet-igsn/domain/service-account/service-account-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

import { requestServiceAccount } from "#/domain/service-accounts/client/request-service-account.ts";
import { m } from "#/paraglide/messages.js";

export function useRequestServiceAccount(onSent: () => void) {
  const token = useAuth().user?.access_token ?? "";
  return useMutation({
    mutationFn: (body: ServiceAccountRequest) =>
      requestServiceAccount(body, token),
    onSuccess: () => {
      toast.success(m.service_account_request_success());
      onSent();
    },
    onError: () => toast.error(m.service_account_request_error()),
  });
}
