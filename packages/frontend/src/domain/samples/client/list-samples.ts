import type { Sample } from "@projet-igsn/domain/sample/sample";

import { listSamplesResponseSchema } from "@projet-igsn/domain/sample/sample-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

export type SampleFilters = Record<string, string | number | undefined>;

export type ListSamplesParams = {
  page: number;
  perPage: number;
  search?: string;
  filters?: SampleFilters;
  bbox?: string;
};
export type ListSamplesResult = { data: Sample[]; total: number };

export async function listSamples(
  { page, perPage, search, filters, bbox }: ListSamplesParams,
  fetchFn: typeof fetch = apiFetch,
): Promise<ListSamplesResult> {
  const url = new URL("samples", baseApiUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(perPage));
  if (search) url.searchParams.set("search", search);
  if (bbox) url.searchParams.set("bbox", bbox);
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
