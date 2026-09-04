import type { ServiceAccountBody } from "@projet-igsn/domain/service-account/service-account-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isNameTaken } from "#/manual-groups/is-name-taken.ts";
import { m } from "#/paraglide/messages.js";
import { createServiceAccount } from "#/service-accounts/client/create-service-account.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useCreateServiceAccount() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ServiceAccountBody) =>
      createServiceAccount(apiFetch, body),
    onSuccess: () => {
      toast.success(m.service_account_created());
      return queryClient.invalidateQueries({ queryKey: ["service-accounts"] });
    },
    onError: (error) => {
      if (!isNameTaken(error)) toast.error(m.service_account_create_error());
    },
  });
}
