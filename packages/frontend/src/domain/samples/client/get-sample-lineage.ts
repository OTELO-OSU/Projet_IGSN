import type { SampleLineage } from "@projet-igsn/domain/sample/lineage/model";

import { sampleLineageResponseSchema } from "@projet-igsn/domain/sample/sample-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

const EMPTY_LINEAGE: SampleLineage = {
  nodes: [],
  edges: [],
  truncated: false,
};

export async function getSampleLineage(
  igsn: string,
  fetchFn: typeof fetch = apiFetch,
): Promise<SampleLineage> {
  const res = await fetchFn(new URL(`samples/${igsn}/lineage`, baseApiUrl));
  if (res.status === 404) {
    return EMPTY_LINEAGE;
  }
  if (!res.ok) {
    throw new Error(`Failed to load the sample lineage (${res.status})`);
  }
  const { data } = sampleLineageResponseSchema.parse(await res.json());
  return data;
}
