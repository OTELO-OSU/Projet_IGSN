import type { Sample } from "@projet-igsn/domain/sample/sample";

import { listSamplesResponseSchema } from "@projet-igsn/domain/sample/sample-validator";

import { baseApiUrl } from "#/api.ts";

// Facet filters are passed opaquely: the key is the API query param (from the
// facet registry), the value its selection. Undefined/empty entries are skipped.
export type SampleFilters = Record<string, string | number | undefined>;

export type ListSamplesParams = {
  page: number;
  perPage: number;
  search?: string;
  filters?: SampleFilters;
};
export type ListSamplesResult = { data: Sample[]; total: number };

export async function listSamples(
  { page, perPage, search, filters }: ListSamplesParams,
  fetchFn: typeof fetch = fetch,
): Promise<ListSamplesResult> {
  const url = new URL("samples", baseApiUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(perPage));
  if (search) url.searchParams.set("search", search);
  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Failed to load samples (${res.status})`);
  }
  const { data, meta } = listSamplesResponseSchema.parse(await res.json());
  return { data, total: meta.total };
}
