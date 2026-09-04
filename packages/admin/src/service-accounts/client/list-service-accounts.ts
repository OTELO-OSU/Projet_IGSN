import type {
  ListServiceAccountsQuery,
  ListServiceAccountsResponse,
} from "@projet-igsn/domain/service-account/service-account-validator";

import { listServiceAccountsResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";

export async function listServiceAccounts(
  apiFetch: typeof fetch,
  query: ListServiceAccountsQuery,
): Promise<ListServiceAccountsResponse> {
  const url = new URL("admin/service-accounts", API_URL);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }
  const res = await apiFetch(url);
  if (!res.ok) {
    throw HttpError.fromResponse(
      res,
      `Failed to load the service accounts (${res.status})`,
    );
  }
  return listServiceAccountsResponseSchema.parse(await res.json());
}
