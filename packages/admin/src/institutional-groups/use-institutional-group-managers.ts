import type { InstitutionalGroupRef } from "@projet-igsn/domain/institutional-group/model";

import { groupManagersResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useInstitutionalGroupManagers({
  kind,
  code,
}: InstitutionalGroupRef) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["institutional-groups", kind, code, "managers"],
    queryFn: async () => {
      const res = await apiFetch(
        new URL(`admin/institutional-groups/${kind}/${code}/managers`, API_URL),
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load the institutional group managers (${res.status})`,
        );
      }
      return groupManagersResponseSchema.parse(await res.json()).data;
    },
  });
}
