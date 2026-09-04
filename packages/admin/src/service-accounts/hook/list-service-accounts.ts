import type { ListServiceAccountsQuery } from "@projet-igsn/domain/service-account/service-account-validator";

import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";

import { listServiceAccounts } from "#/service-accounts/client/list-service-accounts.ts";
import { useApiClient } from "#/use-api-client.ts";

export const listServiceAccountsQueryOptions = (
  apiFetch: typeof fetch,
  query: ListServiceAccountsQuery,
) =>
  queryOptions({
    queryKey: ["service-accounts", "list", query],
    queryFn: () => listServiceAccounts(apiFetch, query),
    placeholderData: keepPreviousData,
  });

export function useListServiceAccounts(query: ListServiceAccountsQuery) {
  return useQuery(listServiceAccountsQueryOptions(useApiClient(), query));
}
