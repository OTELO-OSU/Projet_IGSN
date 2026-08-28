import type { ManualGroupsResponse } from "@projet-igsn/domain/manual-group/manual-group-validator";
import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";

import { apiFetch, apiJson, baseApiUrl } from "#/api.ts";

export async function listManualGroups(
  fetchFn: typeof fetch = apiFetch,
): Promise<ManualGroup[]> {
  const res = await fetchFn(new URL("manual-groups", baseApiUrl));
  const { data } = await apiJson<ManualGroupsResponse>(res, "manual groups");
  return data;
}
