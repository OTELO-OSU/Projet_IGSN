import { requestableInstitutionalGroupsResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useListRequestableGroups() {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["currentUser", "service-accounts", "requestable-groups"],
    queryFn: () =>
      apiJson(
        apiFetch,
        new URL(
          "admin/currentUser/service-accounts/requestable-groups",
          API_URL,
        ),
        requestableInstitutionalGroupsResponseSchema,
        "Failed to load the groups you may request",
      ),
  });
}
