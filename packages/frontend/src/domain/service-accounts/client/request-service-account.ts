import type { ServiceAccountRequest } from "@projet-igsn/domain/service-account/service-account-validator";

import { baseBrowserApiUrl } from "#/api.ts";

export async function requestServiceAccount(
  body: ServiceAccountRequest,
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchFn(
    new URL("admin/currentUser/service-accounts/requests", baseBrowserApiUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to request a service account (${res.status})`);
  }
}
