import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";

import { manualGroupsResponseSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

export async function listManualGroups(
  fetchFn: typeof fetch = apiFetch,
): Promise<ManualGroup[]> {
  const res = await fetchFn(new URL("manual-groups", baseApiUrl));
  if (!res.ok) {
    throw new Error(`Failed to load manual groups (${res.status})`);
  }
  const { data } = manualGroupsResponseSchema.parse(await res.json());
  return data;
}
