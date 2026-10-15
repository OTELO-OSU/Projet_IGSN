import {
  type SampleMapDetailsResponse,
  sampleMapDetailsResponseSchema,
} from "@projet-igsn/domain/sample/map/model";

import { apiFetch, baseApiUrl } from "#/api.ts";

export async function mapSampleDetails(
  numbers: number[],
  fetchFn: typeof fetch = apiFetch,
): Promise<SampleMapDetailsResponse> {
  const url = new URL("samples/map/samples", baseApiUrl);
  url.searchParams.set("numbers", numbers.join(","));

  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Failed to load the map samples (${res.status})`);
  }
  return sampleMapDetailsResponseSchema.parse(await res.json());
}
