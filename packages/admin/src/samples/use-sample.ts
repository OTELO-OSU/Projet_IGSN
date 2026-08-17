import { adminSampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { queryOptions, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export class ForbiddenError extends HttpError {
  constructor() {
    super(403, "Sample owned by another researcher");
  }
}

export async function parseSampleResponse(res: Response) {
  if (res.status === 404) {
    return null;
  }
  if (res.status === 403) {
    throw new ForbiddenError();
  }
  if (!res.ok) {
    throw HttpError.fromResponse(res, `Failed to load sample (${res.status})`);
  }
  const { data, role, manualGroupOptions } = adminSampleResponseSchema.parse(
    await res.json(),
  );
  return {
    ...data,
    role,
    // A group the owner has left is no longer attachable but stays attached
    // until they detach it, so the form has to keep offering it.
    manualGroupOptions: [
      ...manualGroupOptions,
      ...data.manualGroups.filter(
        (group) => !manualGroupOptions.some((option) => option.id === group.id),
      ),
    ],
    manualGroupIds: data.manualGroups.map((group) => group.id),
  };
}

export function sampleQueryOptions(
  apiFetch: ReturnType<typeof useApiClient>,
  id: string | undefined,
) {
  return queryOptions({
    queryKey: ["samples", id],
    queryFn: async () =>
      parseSampleResponse(
        await apiFetch(new URL(`admin/samples/${id}`, API_URL)),
      ),
    enabled: id !== undefined,
  });
}

export function useSample(id: string) {
  return useQuery(sampleQueryOptions(useApiClient(), id));
}
