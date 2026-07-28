import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { useApiClient } from "#/use-api-client.ts";

// The sample exists but belongs to another researcher, so the page shows an
// access error instead of the generic load failure. Never mapped to 401, which
// the api client would turn into a token renewal then a sign-in redirect.
export class ForbiddenError extends Error {}

export async function parseSampleResponse(res: Response) {
  if (res.status === 404) {
    return null;
  }
  if (res.status === 403) {
    throw new ForbiddenError("Sample owned by another researcher");
  }
  if (!res.ok) {
    throw new Error(`Failed to load sample (${res.status})`);
  }
  return sampleResponseSchema.parse(await res.json()).data;
}

export function useSample(id: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["samples", id],
    queryFn: async () =>
      parseSampleResponse(
        await apiFetch(new URL(`admin/samples/${id}`, API_URL)),
      ),
  });
}
