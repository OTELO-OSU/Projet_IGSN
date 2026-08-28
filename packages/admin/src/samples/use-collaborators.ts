import type { SampleCollaboratorsResponse } from "@projet-igsn/domain/user-sample/user-sample-validator";

import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useCollaborators(sampleId: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["samples", sampleId, "collaborators"],
    queryFn: async () => {
      const res = await apiFetch(
        new URL(`admin/samples/${sampleId}/collaborators`, API_URL),
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load collaborators (${res.status})`,
        );
      }
      return ((await res.json()) as SampleCollaboratorsResponse).data;
    },
  });
}
