import type { InstitutionalGroupRef } from "@projet-igsn/domain/institutional-group/model";

import { groupManagersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useInstitutionalGroupManagers({
  kind,
  code,
}: InstitutionalGroupRef) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["institutional-groups", kind, code, "managers"],
    queryFn: async () => {
      const { data } = await apiJson(
        apiFetch,
        new URL(`admin/institutional-groups/${kind}/${code}/managers`, API_URL),
        groupManagersResponseSchema,
        "Failed to load the institutional group managers",
      );
      return data;
    },
  });
}
