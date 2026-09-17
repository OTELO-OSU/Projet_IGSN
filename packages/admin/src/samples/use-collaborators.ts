import { sampleCollaboratorsResponseSchema } from "@projet-igsn/domain/user-sample/user-sample-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useCollaborators(sampleId: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["samples", sampleId, "collaborators"],
    queryFn: async () => {
      const { data } = await apiJson(
        apiFetch,
        new URL(`admin/samples/${sampleId}/collaborators`, API_URL),
        sampleCollaboratorsResponseSchema,
        "Failed to load collaborators",
      );
      return data;
    },
  });
}
