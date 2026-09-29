import type { Sample } from "@projet-igsn/domain/sample/sample";

import { listSamplesResponseSchema } from "@projet-igsn/domain/sample/sample-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

export type SampleFilters = Record<
  string,
  string | number | boolean | undefined
>;

export type ListSamplesParams = {
  page: number;
  perPage: number;
  search?: string;
  filters?: SampleFilters;
  bbox?: string;
  viewport?: string;
};
export type ListSamplesResult = { data: Sample[]; total: number };

export type SearchFilters = Omit<ListSamplesParams, "page" | "perPage">;

export function searchFilterParams({
  search,
  filters,
  bbox,
  viewport,
}: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (bbox) params.set("bbox", bbox);
  if (viewport) params.set("viewport", viewport);
  for (const [key, value] of Object.entries(filters ?? {})) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  return params;
}

export async function listSamples(
  { page, perPage, ...filters }: ListSamplesParams,
  fetchFn: typeof fetch = apiFetch,
): Promise<ListSamplesResult> {
  const url = new URL("samples", baseApiUrl);
  url.search = searchFilterParams(filters).toString();
  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", String(perPage));

  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Failed to load samples (${res.status})`);
  }
  const { data, meta } = listSamplesResponseSchema.parse(await res.json());
  return { data, total: meta.total };
}
