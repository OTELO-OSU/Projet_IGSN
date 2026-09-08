import type { MyManualGroup } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { myManualGroupsResponseSchema } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { baseBrowserApiUrl } from "#/api.ts";

export async function listMyManualGroups(
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<MyManualGroup[]> {
  const res = await fetchFn(
    new URL("admin/currentUser/manual-groups", baseBrowserApiUrl),
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Failed to load your manual groups (${res.status})`);
  }
  const { data } = myManualGroupsResponseSchema.parse(await res.json());
  return data;
}
