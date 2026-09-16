import type { ListServiceAccountsQuery } from "@projet-igsn/domain/service-account/service-account-validator";

import { listServiceAccountsResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useListServiceAccounts(query: ListServiceAccountsQuery) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["service-accounts", "list", query],
    queryFn: () => {
      const url = new URL("admin/service-accounts", API_URL);
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, String(value));
      }
      return apiJson(
        apiFetch,
        url,
        listServiceAccountsResponseSchema,
        "Failed to load the service accounts",
      );
    },
    placeholderData: keepPreviousData,
  });
}
