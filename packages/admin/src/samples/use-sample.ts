import type { AdminSampleResponse } from "@projet-igsn/domain/sample/sample-validator";

import { queryOptions, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export class ForbiddenError extends HttpError {
  constructor() {
    super(403, "Sample owned by another researcher");
  }
}

export async function toSampleQueryData(res: Response) {
  if (res.status === 404) {
    return null;
  }
  if (res.status === 403) {
    throw new ForbiddenError();
  }
  if (!res.ok) {
    throw HttpError.fromResponse(res, `Failed to load sample (${res.status})`);
  }
  const { data, role, manualGroupOptions } =
    (await res.json()) as AdminSampleResponse;
  const offered = new Map(
    [...manualGroupOptions, ...data.manualGroups].map((group) => [
      group.id,
      group,
    ]),
  );
  return {
    ...data,
    role,
    manualGroupOptions: [...offered.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
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
      toSampleQueryData(
        await apiFetch(new URL(`admin/samples/${id}`, API_URL)),
      ),
    enabled: id !== undefined,
  });
}

export function useSample(id: string) {
  return useQuery(sampleQueryOptions(useApiClient(), id));
}
