import { queryOptions, useQuery } from "@tanstack/react-query";

import { listMyServiceAccounts } from "#/service-accounts/client/list-my-service-accounts.ts";
import { useApiClient } from "#/use-api-client.ts";

export const MY_SERVICE_ACCOUNTS_KEY = ["currentUser", "service-accounts"];

export const listMyServiceAccountsQueryOptions = (apiFetch: typeof fetch) =>
  queryOptions({
    queryKey: MY_SERVICE_ACCOUNTS_KEY,
    queryFn: () => listMyServiceAccounts(apiFetch),
  });

export function useListMyServiceAccounts() {
  return useQuery(listMyServiceAccountsQueryOptions(useApiClient()));
}
