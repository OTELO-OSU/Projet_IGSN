import type { RequestableInstitutionalGroups } from "@projet-igsn/domain/service-account/service-account-validator";

import { requestableInstitutionalGroupsResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";

import { baseBrowserApiUrl } from "#/api.ts";

export async function listRequestableGroups(
  token: string,
): Promise<RequestableInstitutionalGroups> {
  const res = await fetch(
    new URL(
      "admin/currentUser/service-accounts/requestable-groups",
      baseBrowserApiUrl,
    ),
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(
      `Failed to load the groups you may request (${res.status})`,
    );
  }
  const { data } = requestableInstitutionalGroupsResponseSchema.parse(
    await res.json(),
  );
  return data;
}
