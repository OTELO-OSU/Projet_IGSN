import type { Sample } from "@projet-igsn/domain/sample/sample";

import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";

import { baseApiUrl } from "#/api.ts";

export async function getSampleByIgsn(
  igsn: string,
  fetchFn: typeof fetch = fetch,
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
