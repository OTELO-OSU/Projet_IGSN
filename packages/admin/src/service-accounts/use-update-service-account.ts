import type { ServiceAccountBody } from "@projet-igsn/domain/service-account/service-account-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { serviceAccountResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { isNameTaken } from "#/is-name-taken.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useUpdateServiceAccount(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ServiceAccountBody) => {
      const { data } = await apiJson(
        apiFetch,
        new URL(`admin/service-accounts/${id}`, API_URL),
        serviceAccountResponseSchema,
        "Failed to update the service account",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      return data;
    },
    onSuccess: () => {
      toast.success(m.service_account_updated());
      return queryClient.invalidateQueries({ queryKey: ["service-accounts"] });
    },
    onError: (error) => {
      if (!isNameTaken(error)) toast.error(m.service_account_update_error());
    },
  });
}
