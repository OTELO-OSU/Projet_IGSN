import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";

import { manualGroupsResponseSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { baseBrowserApiUrl } from "#/api.ts";

export async function listAttachableManualGroups(
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<ManualGroup[]> {
  const res = await fetchFn(
    new URL("admin/currentUser/attachable-manual-groups", baseBrowserApiUrl),
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Failed to load your manual groups (${res.status})`);
  }
  const { data } = manualGroupsResponseSchema.parse(await res.json());
  return data;
}
