import type { MyServiceAccountsResponse } from "@projet-igsn/domain/service-account/service-account-validator";

import { myServiceAccountsResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";

export async function listMyServiceAccounts(
  apiFetch: typeof fetch,
): Promise<MyServiceAccountsResponse> {
  const res = await apiFetch(
    new URL("admin/currentUser/service-accounts", API_URL),
  );
  if (!res.ok) {
    throw HttpError.fromResponse(
      res,
      `Failed to load your services (${res.status})`,
    );
  }
  return myServiceAccountsResponseSchema.parse(await res.json());
}
