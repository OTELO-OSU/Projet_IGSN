import {
  type SampleFacetCounts,
  sampleFacetCountsResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";
import {
  type SearchFilters,
  searchFilterParams,
} from "#/domain/samples/client/list-samples.ts";

export async function listSampleFacetCounts(
  filters: SearchFilters,
  fetchFn: typeof fetch = apiFetch,
): Promise<SampleFacetCounts> {
  const url = new URL("samples/facets", baseApiUrl);
  url.search = searchFilterParams(filters).toString();

  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Failed to load sample facet counts (${res.status})`);
  }
  return sampleFacetCountsResponseSchema.parse(await res.json()).data;
}
