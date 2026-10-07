import type { Stats } from "@projet-igsn/domain/stats/model";

import { statsResponseSchema } from "@projet-igsn/domain/stats/stats-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

export async function getStats(
  fetchFn: typeof fetch = apiFetch,
): Promise<Stats> {
  const res = await fetchFn(new URL("stats", baseApiUrl));
  if (!res.ok) {
    throw new Error(`Failed to load stats (${res.status})`);
  }
  const { data } = statsResponseSchema.parse(await res.json());
  return data;
}
