import type {
  PublicSample,
  PublicSampleResponse,
} from "@projet-igsn/domain/sample/sample-validator";

import { apiFetch, apiJson, baseApiUrl } from "#/api.ts";

export async function getSampleByIgsn(
  igsn: string,
  fetchFn: typeof fetch = apiFetch,
): Promise<PublicSample | null> {
  const res = await fetchFn(new URL(`samples/${igsn}`, baseApiUrl));
  if (res.status === 404) {
    return null;
  }
  const { data } = await apiJson<PublicSampleResponse>(res, "sample");
  return data;
}
