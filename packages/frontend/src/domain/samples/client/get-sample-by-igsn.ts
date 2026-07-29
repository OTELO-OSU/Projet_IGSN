import type { Sample } from "@projet-igsn/domain/sample/sample";

import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

export async function getSampleByIgsn(
  igsn: string,
  fetchFn: typeof fetch = apiFetch,
): Promise<Sample | null> {
  const res = await fetchFn(new URL(`samples/${igsn}`, baseApiUrl));
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to load sample (${res.status})`);
  }
  const { data } = sampleResponseSchema.parse(await res.json());
  return data;
}
