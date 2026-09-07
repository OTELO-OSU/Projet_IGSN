import { queryOptions, useQuery } from "@tanstack/react-query";

import { getServiceAccountById } from "#/service-accounts/client/get-service-account-by-id.ts";
import { useApiClient } from "#/use-api-client.ts";

export const getServiceAccountByIdQueryOptions = (
  apiFetch: typeof fetch,
  id: string,
) =>
  queryOptions({
    queryKey: ["service-accounts", "detail", id],
    queryFn: () => getServiceAccountById(apiFetch, id),
  });

export function useGetServiceAccountById(id: string) {
  return useQuery(getServiceAccountByIdQueryOptions(useApiClient(), id));
}
