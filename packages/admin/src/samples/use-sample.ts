import { adminSampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { queryOptions, useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

// Never mapped to 401, which the api client would turn into a token renewal
// then a sign-in redirect.
export class ForbiddenError extends HttpError {
  constructor() {
    super(403, "Sample owned by another researcher");
  }
}

export async function parseSampleResponse(res: Response) {
  // A 404 resolves rather than throws: "no such sample" is an answer the page
  // renders, not a failure, so it is never retried either.
  if (res.status === 404) {
    return null;
  }
  if (res.status === 403) {
    throw new ForbiddenError();
  }
  if (!res.ok) {
    throw HttpError.fromResponse(res, `Failed to load sample (${res.status})`);
  }
  const { data, role } = adminSampleResponseSchema.parse(await res.json());
  return { ...data, role };
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
