import {
  type SampleMapResponse,
  sampleMapResponseSchema,
} from "@projet-igsn/domain/sample/map/model";

import { apiFetch, baseApiUrl } from "#/api.ts";
import {
  type SearchFilters,
  searchFilterParams,
} from "#/domain/samples/client/list-samples.ts";

export type MapSamplesParams = SearchFilters & {
  viewport: string;
  zoom: number;
};

export async function mapSamples(
  { viewport, zoom, ...filters }: MapSamplesParams,
  fetchFn: typeof fetch = apiFetch,
): Promise<SampleMapResponse> {
  const url = new URL("samples/map", baseApiUrl);
  url.search = searchFilterParams(filters).toString();
  url.searchParams.set("viewport", viewport);
  url.searchParams.set("zoom", String(zoom));

  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Failed to load the sample map (${res.status})`);
  }
  return sampleMapResponseSchema.parse(await res.json());
}
