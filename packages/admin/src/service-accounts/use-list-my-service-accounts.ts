import { myServiceAccountsResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export const MY_SERVICE_ACCOUNTS_KEY = ["currentUser", "service-accounts"];

export function useListMyServiceAccounts() {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: MY_SERVICE_ACCOUNTS_KEY,
    queryFn: () =>
      apiJson(
        apiFetch,
        new URL("admin/currentUser/service-accounts", API_URL),
        myServiceAccountsResponseSchema,
        "Failed to load your services",
      ),
  });
}
